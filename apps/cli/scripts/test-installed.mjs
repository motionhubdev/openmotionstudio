// Run against the unpacked installation, not the development workspace.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const installed = resolve(process.argv[2]);
const scratch = await mkdtemp(join(tmpdir(), 'oms-skill-test-'));
function oms(...args) {
  return execFileSync(process.execPath, [join(installed, 'oms.mjs'), ...args], {
    encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'],
    // No voice provider's key, whatever the machine has: the test speaks nothing it would pay for.
    env: { ...process.env, CLAUDE_CONFIG_DIR: join(scratch, 'claude'), CODEX_HOME: join(scratch, 'codex'), MINIMAX_API_KEY: '', ELEVENLABS_API_KEY: '', OPENAI_API_KEY: '', AZURE_SPEECH_KEY: '' },
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
  assert.equal(await readFile(join(starter, '.gitignore'), 'utf8'), '/*.mp4\n/*.srt\n/*.png\n.motion-studio/\n');
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
  // Its sound, for the starter's cues, as a track the film plays.
  const sound = oms('sound', starter, '--cues', '0.5:land, 3:cut', '--seconds', '6', '--out', join(starter, 'media/effects.wav'));
  assert.match(sound, /Wrote media\/effects\.wav from @iamsuosi\/plumb-line's sound \(roles: land, move, draw, count, cut\)/);
  assert.match(sound, /Track: peak -?\d+\.\d dBFS/);
  assert.match(sound, /^ {2}3s cut: peak -?\d+\.\d dBFS$/m);
  assert.equal((await readFile(join(starter, 'media/effects.wav'))).toString('ascii', 0, 4), 'RIFF');
  assert.throws(() => oms('sound', starter, '--cues', '0.5:land', '--seconds', '6', '--out', join(starter, 'media/effects.wav')), /is there already/);
  // --out is a path from where oms runs, as still's and render's are: a bare media/… is outside the project.
  assert.throws(() => oms('sound', starter, '--cues', '0.5:land', '--seconds', '6', '--out', 'media/stray.wav'), /is outside the project/);
  assert.throws(() => oms('sound', starter, '--cues', '0.5:bang', '--seconds', '6', '--out', join(starter, 'media/other.wav')), /no cue/);
  assert.throws(() => oms('sound', starter, '--cues', '0.5:land, 2:out', '--seconds', '6', '--out', join(starter, 'media/other.wav')), /has no out: its roles are land, move, draw, count, cut/);

  // A narration: the film must name its voice, and the provider's key comes from the environment alone.
  assert.throws(() => oms('voice', starter), /The film names no voice/);
  const voiced = join(scratch, 'Voiced');
  oms('init', voiced);
  await writeFile(join(voiced, 'film.tsx'), (await readFile(join(voiced, 'film.tsx'), 'utf8')).replace('<Film>', '<Film voice="minimax:male-qn-jingying">'));
  assert.throws(() => oms('voice', voiced), /MiniMax speaks with the key in MINIMAX_API_KEY/);
  assert.throws(() => oms('voice', voiced, '--recording', join(voiced, 'film.tsx')), /A recording is transcribed by MiniMax, OpenAI or ElevenLabs/);
  assert.match(JSON.parse(oms('check', voiced, '--json')).issues.find((issue) => issue.id === 'unvoiced').text, /^Not yet spoken in minimax:male-qn-jingying: .* oms voice speaks them\.$/);
  // A film file for the Studio's Import: the project's own files, and not the render beside them.
  await writeFile(join(voiced, 'Voiced.mp4'), 'render');
  assert.equal(oms('pack', voiced).trim(), `${voiced}.oms`);
  const packed = gunzipSync(await readFile(`${voiced}.oms`)).toString('latin1');
  assert.ok(packed.includes('film.tsx') && packed.includes('.gitignore') && !packed.includes('Voiced.mp4'));
  assert.throws(() => oms('pack', voiced, '--out', join(scratch, 'film.zip')), /ending in \.oms/);

  // A face from Google Fonts, cut to the characters the project writes, with its licence.
  await writeFile(join(starter, 'parts.tsx'), "export const words = '四季';");
  assert.match(oms('font', starter, '--family', 'Noto Sans SC', '--weights', '400'), /Wrote media\/fonts\/noto-sans-sc-400\.ttf, media\/fonts\/noto-sans-sc-LICENSE\.txt: Noto Sans SC cut to the \d+ characters the project writes \(SIL Open Font License 1\.1\)/);
  // Several families at once, each in its own weights.
  const both = oms('font', starter, '--family', 'Noto Sans SC:700', '--family', 'Hanken Grotesk', '--weights', '500');
  assert.match(both, /Wrote media\/fonts\/noto-sans-sc-700\.ttf/);
  assert.match(both, /Wrote media\/fonts\/hanken-grotesk-500\.ttf/);
  assert.match(both, /@font-face \{ font-family: 'Hanken Grotesk'; font-weight: 500; src: url\(\$\{hanken_grotesk_500\}\); \}/);
  assert.equal((await readFile(join(starter, 'media/fonts/noto-sans-sc-400.ttf'))).readUInt32BE(0), 0x00010000);
  assert.match(await readFile(join(starter, 'media/fonts/noto-sans-sc-LICENSE.txt'), 'utf8'), /SIL Open Font License, Version 1\.1/);

  // Chinese in a stack whose one loaded face is Latin falls past it to the machine's own face, and is said.
  const mixed = join(scratch, 'Mixed');
  await mkdir(join(mixed, 'media'), { recursive: true });
  await cp(fileURLToPath(new URL('../../desktop/node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', import.meta.url)), join(mixed, 'media/latin.woff2'));
  await writeFile(join(mixed, 'film.tsx'), `import {Film, Scene, Layer} from '@motionhub/runtime';
import latin from './media/latin.woff2';
export const film = {width: 1280, height: 720, fps: 30};
export default function Main() {
  return <Film><style>{\`@font-face { font-family: Latin; src: url(\${latin}); }\`}</style>
    <Scene id="one" duration={2}><Layer id="title" x={100} y={100} w={1000} h={200}>
      <div style={{font: '700 80px Latin, sans-serif', color: '#fff'}}>Sky 天空</div>
    </Layer></Scene></Film>;
}
`);
  const faces = JSON.parse(oms('check', mixed, '--json')).issues;
  assert.equal(faces.length, 1, JSON.stringify(faces));
  assert.match(faces[0].text, /^Characters the faces it loads lack fall to this machine's own sans-serif face: layer “title” \(“天空”\)/);

  const project = join(scratch, '影片 Sample');
  await cp(join(installed, 'skills/oms/example'), project, { recursive: true });
  const report = JSON.parse(oms('check', project, '--json'));
  assert.equal(report.film.seconds, 20);
  assert.equal(report.checkedFrames, 12); // its start, three scenes half a second in and at their middles, four lines at 85 %, its end
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

  // A recorded clip the film imports: a still, and each frame of a render, shows the clip's own frame at its time, on a
  // frame's boundary too (89 / 30 s), from startAt and trimBefore, held on its last frame once it has ended.
  const clipped = join(scratch, 'Clipped');
  await mkdir(join(clipped, 'media'), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-filter_complex', 'color=red:s=64x64:r=30:d=3,trim=end_frame=89[a];color=lime:s=64x64:r=30:d=2,trim=end_frame=31[b];[a][b]concat=n=2:v=1[v]',
    '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', join(clipped, 'media/clip.mp4')]);
  const clipFilm = (src) => `import {Film, Scene, Layer, Video} from '@motionhub/runtime';
import clip from './media/clip.mp4';
export const film = {width: 64, height: 64, fps: 30};
export default function Main() {
  return <Film><Layer id="ground"><div style={{width: '100%', height: '100%', background: '#000'}} /></Layer>
    <Scene id="whole" duration={3}><Layer id="clip"><Video src={${src}} /></Layer></Scene>
    <Scene id="trimmed" duration={2}><Layer id="clip"><Video src={${src}} startAt={1} trimBefore={2.5} /></Layer></Scene>
    <Scene id="held" duration={5}><Layer id="clip"><Video src={${src}} /></Layer></Scene>
  </Film>;
}
`;
  await writeFile(join(clipped, 'film.tsx'), clipFilm('clip'));
  // Red, green or black, from a picture's middle pixel as ffmpeg decodes it.
  const colour = (file, frame = 0) => {
    const [r, g, b] = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${frame}),format=rgb24,crop=2:2:31:31,scale=1:1`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
    return r > 180 && g < 80 ? 'red' : g > 180 && r < 80 ? 'green' : Math.max(r, g, b) < 40 ? 'black' : `rgb(${r}, ${g}, ${b})`;
  };
  for (const [at, expected] of [[88 / 30, 'red'], [89 / 30, 'green'], [3.5, 'black'], [4.5, 'green'], [9.8, 'green']]) {
    const still = join(scratch, `clipped-${at.toFixed(3)}.png`);
    oms('still', clipped, '--at', String(at), '--out', still);
    assert.equal(colour(still), expected, `the still at ${at.toFixed(3)} s`);
  }
  const clippedVideo = join(scratch, 'clipped.mp4');
  oms('render', clipped, '--out', clippedVideo);
  for (const [frame, expected] of [[88, 'red'], [89, 'green'], [119, 'black'], [120, 'red'], [133, 'red'], [134, 'green'], [299, 'green']])
    assert.equal(colour(clippedVideo, frame), expected, `frame ${frame} of the render`);
  // A clip named by its path is refused with how to give it: the web player carries only what the film imports.
  await writeFile(join(clipped, 'film.tsx'), clipFilm('"media/clip.mp4"'));
  assert.throws(() => oms('check', clipped, '--json'), error =>
    error.status === 1 && JSON.parse(error.stdout).issues.some(issue => issue.text.includes('import the clip')));

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
  // A film that draws its lines as captions carries no subtitle track as well: they would show twice. Its .srt is beside it.
  await writeFile(join(scored, 'film.tsx'), (await readFile(join(scored, 'film.tsx'), 'utf8')).replace('<Film>', '<Film captions>'));
  const captioned = join(scratch, 'captioned.mp4');
  oms('render', scored, '--out', captioned);
  const captionedProbe = (() => { try { return execFileSync('ffmpeg', ['-hide_banner', '-i', captioned], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (error) { return error.stderr; } })();
  assert.doesNotMatch(captionedProbe, /Subtitle/);
  assert.match(await readFile(join(scratch, 'captioned.srt'), 'utf8'), /One\./);

  // The same film as a web player: the player, the frame's document, and its sound as one soundtrack as long as the film.
  const web = join(scratch, 'scored-web');
  assert.equal(oms('player', scored, '--out', web).trim(), web);
  assert.deepEqual((await readdir(web)).sort(), ['frame.js', 'index.html', 'player.js', 'soundtrack.mp4']);
  const track = (() => { try { return execFileSync('ffmpeg', ['-hide_banner', '-i', join(web, 'soundtrack.mp4')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (error) { return error.stderr; } })();
  for (const stream of [/Audio: aac/, /Duration: 00:00:02\.0/]) assert.match(track, stream);
  assert.match(await readFile(join(web, 'index.html'), 'utf8'), /"sound":true/);
  assert.throws(() => oms('player', scored, '--out', web), /is not empty/);
  // A film without sound has no soundtrack.
  const quiet = join(scratch, 'example-web');
  oms('player', project, '--out', quiet);
  assert.match(await readFile(join(quiet, 'index.html'), 'utf8'), /"sound":false/);

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
  console.log('PASS installed skill, starter, editable example, PNG, bounds, a fresh frame, a recorded clip in stills and a render, a render (with and without a subtitle track), a web player, a face from Google Fonts, a narration voice and its key, a film file for the Studio, a motion from motionhub and its sound, and missing audio');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
