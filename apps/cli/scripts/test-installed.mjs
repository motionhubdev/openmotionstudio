// Run against the unpacked installation, not the development workspace.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const installed = resolve(process.argv[2]);
const scratch = await mkdtemp(join(tmpdir(), 'oms-skill-test-'));
function oms(...args) {
  return execFileSync(process.execPath, [join(installed, 'oms.mjs'), ...args], {
    encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CLAUDE_CONFIG_DIR: join(scratch, 'claude'), CODEX_HOME: join(scratch, 'codex') },
  });
}
try {
  for (const host of ['claude', 'codex']) {
    oms('install', host);
    const skill = join(scratch, host, 'skills/oms');
    assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /^name: oms$/m);
    assert.match(await readFile(join(skill, 'film-format.md'), 'utf8'), /@motionhub\/runtime/);
    for (const reference of ['craft', 'look', 'drawing', 'review', 'assets']) assert.match(await readFile(join(skill, `references/${reference}.md`), 'utf8'), /^# /);
    assert.match(await readFile(join(skill, 'example/film.tsx'), 'utf8'), /export default function Main/);
  }
  const starter = join(scratch, 'New film');
  oms('init', starter);
  const source = await readFile(join(starter, 'film.tsx'), 'utf8');
  assert.throws(() => oms('init', starter));
  assert.equal(await readFile(join(starter, 'film.tsx'), 'utf8'), source);
  assert.equal(JSON.parse(oms('check', starter, '--json')).issues.length, 0);

  // A motion from motionhub, taken into a project when a film asks for one.
  const found = JSON.parse(oms('motion', 'search', 'plumb', '--json'));
  assert(found.some((motion) => motion.id === '@iamsuosi/plumb-line'));
  assert.match(oms('motion', 'use', '@iamsuosi/plumb-line', starter), /Took @iamsuosi\/plumb-line/);
  assert.match(await readFile(join(starter, 'motions/@iamsuosi/plumb-line/MOTION.md'), 'utf8'), /\S/);
  assert(JSON.parse(await readFile(join(starter, 'motions.lock.json'), 'utf8')).motions['@iamsuosi/plumb-line'].sha256);
  assert.throws(() => oms('motion', 'use', '@iamsuosi/plumb-line', starter), /already holds/);
  assert.equal(JSON.parse(oms('check', starter, '--json')).issues.length, 0);

  const project = join(scratch, '影片 Sample');
  await cp(join(installed, 'dist/example'), project, { recursive: true });
  const report = JSON.parse(oms('check', project, '--json'));
  assert.equal(report.film.seconds, 20);
  assert.equal(report.checkedFrames, 5);
  assert.deepEqual(report.issues, []);
  assert(report.film.scenes[2].layers.some(layer => layer.id === 'download-address'));
  const png = join(scratch, 'ending.png');
  oms('still', project, '--at', '19', '--out', png);
  const frame = await readFile(png);
  assert.equal(frame.readUInt32BE(16), 540);
  assert.equal(frame.readUInt32BE(20), 960);
  assert.throws(() => oms('still', project, '--at', '20', '--out', png), /Time must be/);
  // A frame slow to raster: a still must show its own time, not the frame the stage held before the seek.
  const heavy = join(scratch, 'Heavy');
  await mkdir(heavy);
  await writeFile(join(heavy, 'film.tsx'), `import {Film, Scene, Layer, useTime} from '@motionhub/runtime';
export const film = {width: 1920, height: 1080, fps: 30};
function Glow() {
  const t = useTime();
  return <div style={{position: 'absolute', inset: 0, background: '#0d0f12'}}>
    {Array.from({length: 40}, (_, i) => <div key={i} style={{position: 'absolute', left: (i * 211) % 1700 + Math.sin(t + i) * 120,
      top: (i * 137) % 900 + Math.cos(t + i) * 90, width: 360, height: 360, borderRadius: '50%', background: \`hsl(\${i * 37} 80% 60%)\`,
      filter: 'blur(40px)', mixBlendMode: 'screen'}} />)}
    <div style={{position: 'absolute', left: 360, top: 240, width: 1200, height: 600, backdropFilter: 'blur(30px)', font: '700 120px sans-serif', color: '#fff'}}>{t.toFixed(1)}</div>
  </div>;
}
export default function Main() {
  return <Film><Scene id="glow" duration={10}><Layer id="glow"><Glow /></Layer></Scene></Film>;
}
`);
  oms('still', heavy, '--at', '0', '--out', join(scratch, 'heavy-0.png'));
  oms('still', heavy, '--at', '5', '--out', join(scratch, 'heavy-5.png'));
  assert.notDeepEqual(await readFile(join(scratch, 'heavy-5.png')), await readFile(join(scratch, 'heavy-0.png')), 'the still at 5 s is the stage\'s earlier frame');

  // A render: the film's picture, its sound mixed in and its lines as subtitles, beside and inside the MP4.
  const scored = join(scratch, 'Scored');
  await mkdir(join(scored, 'media'), { recursive: true });
  const rate = 48000;
  const samples = Buffer.alloc(rate * 2);
  for (let i = 0; i < rate; i++) samples.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 8000), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + samples.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);
  await writeFile(join(scored, 'media/tone.wav'), Buffer.concat([header, samples]));
  await writeFile(join(scored, 'film.tsx'), `import {Film, Scene, Layer, Line, Sound, useTime} from '@motionhub/runtime';
export const film = {width: 540, height: 960, fps: 24};
function Count() { return <div style={{font: '700 120px sans-serif', color: '#fff'}}>{useTime().toFixed(1)}</div>; }
export default function Main() {
  return <Film><Sound src="media/tone.wav" volume={-12} />
    <Scene id="one" duration={1}><Line id="one-line">One.</Line><Layer id="count"><Count /></Layer></Scene>
    <Scene id="two" duration={1}><Line id="two-line">Two.</Line><Layer id="count"><Count /></Layer></Scene>
  </Film>;
}
`);
  const video = join(scratch, 'scored.mp4');
  assert.equal(oms('render', scored, '--out', video).trim(), video);
  const probe = (() => { try { return execFileSync('ffmpeg', ['-hide_banner', '-i', video], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (error) { return error.stderr; } })();
  for (const stream of [/Video: h264/, /540x960/, /Audio: aac/, /Subtitle: mov_text/, /Duration: 00:00:02\.0/]) assert.match(probe, stream);
  assert.match(await readFile(join(scratch, 'scored.srt'), 'utf8'), /One\.[\s\S]*Two\./);
  assert.throws(() => oms('render', scored, '--out', video), /is there already/);

  const silent = join(scratch, 'Missing sound');
  await mkdir(silent);
  await writeFile(join(silent, 'film.tsx'), `import {Film, Scene, Sound} from '@motionhub/runtime';
export const film = {width: 540, height: 960, fps: 24};
export default function Main() {
  return <Film><Scene id="only" duration={1}><Sound src="media/chime.wav" /></Scene></Film>;
}
`);
  assert.throws(() => oms('check', silent, '--json'), error =>
    error.status === 1 && JSON.parse(error.stdout).issues.some(issue => issue.text.includes('media/chime.wav')));
  console.log('PASS installed skill, starter, editable example, PNG, bounds, a fresh frame, a render, a motion from motionhub and missing audio');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
