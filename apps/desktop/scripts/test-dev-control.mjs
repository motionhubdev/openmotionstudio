// The dev build's control server end to end (ADR 0023). The bundle a release ships must not carry it; a build that asks
// for it (OMS_DEV_CONTROL=1) is started with a throwaway profile whose model is a local mock, then driven by
// studio-control.mjs: new → wait → say → wait → export → pack. The release build is made again at the end.
import { execFile, spawn, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import electron from 'electron';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pass = (what) => console.log(`PASS ${what}`);
const build = (env = {}) => {
  const done = spawnSync('pnpm', ['exec', 'electron-vite', 'build'], { cwd: desktop, env: { ...process.env, ...env }, stdio: 'inherit', shell: true });
  assert.equal(done.status, 0, 'electron-vite build failed');
};
const bundled = () => readdirSync(join(desktop, 'out', 'main')).some((name) => readFileSync(join(desktop, 'out', 'main', name), 'utf8').includes('startDevControl'));

assert.equal(spawnSync('node', ['scripts/build-preview.mjs'], { cwd: desktop, stdio: 'inherit' }).status, 0);
build();
assert(!bundled(), 'the release build carries the dev control');
pass('the release build carries no dev control');
build({ OMS_DEV_CONTROL: '1' });
assert(bundled(), 'a build asked for the dev control lacks it');

// A model on 127.0.0.1 that answers every turn with one line, as an OpenAI-compatible stream.
const model = createServer((request, response) => {
  request.resume();
  request.on('end', () => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.end(
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'Noted: the film stays as it is.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 12, completion_tokens: 7 } })}\n\ndata: [DONE]\n\n`,
    );
  });
});
await new Promise((done) => model.listen(0, '127.0.0.1', done));
const temp = await mkdtemp(join(tmpdir(), 'oms-dev-control-'));
const userData = join(temp, 'user-data');
await mkdir(userData);
await writeFile(join(userData, 'settings.json'), JSON.stringify({
  providers: [{ id: 'mock', name: 'Mock', protocol: 'openai', baseUrl: `http://127.0.0.1:${model.address().port}/v1`, model: 'mock-model', images: false }],
  active: 'mock',
  workspace: join(temp, 'projects'),
  preferences: { onboardingComplete: true, checkUpdatesAutomatically: false, backgroundNoticeSeen: true },
}));
const studio = spawn(electron, [desktop, `--user-data-dir=${userData}`], { stdio: 'ignore' });
// Run apart, never blocking this process: the mock model answers from it.
const script = (...args) => promisify(execFile)('node', [join(desktop, 'scripts', 'studio-control.mjs'), ...args, '--user-data', userData], { encoding: 'utf8' });
const control = async (...args) => JSON.parse((await script(...args).catch((error) => assert.fail(`${args[0]}: ${error.stderr}`))).stdout);
try {
  for (let i = 0; i < 600 && !existsSync(join(userData, 'dev-control.json')); i++) await new Promise((done) => setTimeout(done, 100));
  assert(existsSync(join(userData, 'dev-control.json')), 'the dev build wrote no dev-control.json');
  assert(Array.isArray((await control('status')).projects));
  pass('a dev build starts its control and says where');

  const made = await control('new', '--brief', 'A red square that turns blue', '--agent', 'built-in');
  let turn = await control('wait', '--project', made.project, '--since', String(made.since), '--timeout', '120');
  assert.equal(turn.status, 'done', JSON.stringify(turn));
  assert.equal(turn.reply, 'Noted: the film stays as it is.');
  pass('new: a project from a brief, its agent picked, the brief sent and answered');

  const said = await control('say', '--project', made.project, '--text', 'Make it slower.');
  turn = await control('wait', '--project', made.project, '--since', String(said.since), '--timeout', '120');
  assert.equal(turn.status, 'done');
  assert(turn.usage, 'the turn left no usage line');
  pass('say and wait: a turn of notes, its reply and its usage');

  const video = join(temp, 'film.mp4');
  await control('export', '--project', made.project, '--file', video);
  assert(existsSync(video), 'no MP4');
  const film = join(temp, 'film.oms');
  await control('pack', '--project', made.project, '--file', film);
  assert(existsSync(film), 'no film file');
  pass('export and pack to a given path, with no dialog');

  const refused = await script('say', '--project', join(temp, 'elsewhere'), '--text', 'x').then(() => null, (error) => error.stderr);
  assert(refused, 'a folder outside the library was driven');
  pass('a folder outside the library is refused, as in the UI');
} finally {
  studio.kill();
  model.close();
  await new Promise((done) => setTimeout(done, 1000));
  await rm(temp, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  build();
}
