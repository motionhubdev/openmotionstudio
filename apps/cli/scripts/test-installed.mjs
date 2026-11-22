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
  }
  const starter = join(scratch, 'New film');
  oms('init', starter);
  const source = await readFile(join(starter, 'film.tsx'), 'utf8');
  assert.throws(() => oms('init', starter));
  assert.equal(await readFile(join(starter, 'film.tsx'), 'utf8'), source);
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
  console.log('PASS installed skill, starter, editable example, PNG, bounds and missing audio');
} finally {
  await rm(scratch, { recursive: true, force: true });
}
