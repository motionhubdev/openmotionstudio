// Exports scripts/fixtures/frosted.tsx, a film the compositor is slow to draw, through the built Studio with isolated
// user data, and reads each frame of the MP4 back: frame i must show the number i the film draws at its time, so an
// export can never be a frame behind the film (the stamp in src/shared/preview.ts). Run after a build.
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import electron from 'electron';
import ffmpeg from 'ffmpeg-static';

const desktop = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(desktop, 'scripts', 'fixtures', 'frosted.tsx');
/** Where the fixture draws each frame's number, as its CODES: ten 40 px cells from each corner. */
const CODES = [{ x: 400, y: 280 }, { x: 40, y: 1000 }];
const [WIDTH, HEIGHT] = [1920, 1080];

const temp = await mkdtemp(join(tmpdir(), 'oms-frames-test-'));
const video = join(temp, 'frosted.mp4');
await mkdir(join(temp, 'user-data'));
await writeFile(join(temp, 'user-data', 'settings.json'), JSON.stringify({
  providers: [], active: null, workspace: join(temp, 'projects'),
  preferences: { language: 'en', theme: 'light', onboardingComplete: true, backgroundNoticeSeen: true },
}));
await writeFile(join(temp, 'runner.cjs'), `
const { app, BrowserWindow, dialog, webContents } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.setPath('userData', ${JSON.stringify(join(temp, 'user-data'))});
app.setAppPath(${JSON.stringify(desktop)});
app.on('browser-window-created', (_, win) => { win.show = () => {}; win.focus = () => {}; win.webContents.setBackgroundThrottling(false); });
dialog.showSaveDialog = async () => ({ canceled: false, filePath: ${JSON.stringify(video)} });
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(fn, label) {
  let last;
  for (let i = 0; i < 600; i++) {
    try { const value = await fn(); if (value) return value; } catch (error) { last = error; }
    await sleep(200);
  }
  throw new Error('Timed out: ' + label + (last ? ' (' + last.message + ')' : ''));
}
const js = (wc, source) => wc.executeJavaScript(source, true);
require(${JSON.stringify(join(desktop, 'out', 'main', 'index.js'))});
(async () => {
  await app.whenReady();
  const home = (await until(() => BrowserWindow.getAllWindows()[0], 'main window')).webContents;
  await until(async () => !home.isLoading() && await js(home, '!!window.studio'), 'home');
  const [example] = await js(home, 'window.studio.examples()');
  const known = new Set(webContents.getAllWebContents().map((w) => w.id));
  await js(home, 'window.studio.openExample(' + JSON.stringify(example.id) + ')');
  const editor = await until(() => webContents.getAllWebContents().find((w) => !known.has(w.id) && w.getURL() === home.getURL()), 'editor');
  const project = await until(() => js(editor, 'window.studio.currentProject()'), 'project');
  const first = await until(() => js(editor, 'window.studio.lastBuild()'), 'first build');
  await fs.copyFile(${JSON.stringify(fixture)}, path.join(project.path, 'film.tsx'));
  const built = await until(async () => { const b = await js(editor, 'window.studio.lastBuild()'); return b && b.version > first.version && b; }, 'build');
  if (!built.ok) throw new Error('The fixture does not build: ' + built.errors.join('\\n'));
  const started = Date.now();
  await until(() => js(editor, 'window.studio.exportFilm()'), 'export');
  console.log('Exported in ' + ((Date.now() - started) / 1000).toFixed(1) + ' s');
  app.exit(0);
})().catch((error) => { console.error(error); app.exit(1); });
`);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const code = await new Promise((done) => {
  // Chromium will not start as root (a container's user) with its sandbox; the Studio itself never runs so.
  const args = process.getuid?.() === 0 ? ['--no-sandbox'] : [];
  const child = spawn(electron, [...args, join(temp, 'runner.cjs')], { env, stdio: 'inherit', windowsHide: true });
  const timer = setTimeout(() => child.kill(), 10 * 60_000);
  child.on('error', (error) => { console.error(error); done(1); });
  child.on('exit', (exit) => { clearTimeout(timer); done(exit ?? 1); });
});
if (code) {
  console.error('The export failed; its files are in ' + temp);
  process.exit(code);
}

// Each frame as one byte of grey a pixel; a cell is read at its centre.
const decoded = spawnSync(ffmpeg, ['-loglevel', 'error', '-i', video, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 30 });
if (decoded.status !== 0) throw new Error('ffmpeg could not read the export: ' + decoded.stderr);
const frames = decoded.stdout.length / (WIDTH * HEIGHT);
const wrong = [];
for (let i = 0; i < frames; i++) {
  const shown = CODES.map(({ x, y }) => {
    let n = 0;
    for (let bit = 0; bit < 10; bit++) if (decoded.stdout[i * WIDTH * HEIGHT + (y + 20) * WIDTH + x + bit * 40 + 20] > 128) n |= 1 << bit;
    return n;
  });
  if (shown.some((n) => n !== i)) wrong.push(`frame ${i} shows ${shown.join(' and ')}`);
}
if (!frames || wrong.length) {
  console.error(`FAIL ${wrong.length} of ${frames} frames are not their own:\n  ${wrong.join('\n  ')}\nThe export is in ${temp}`);
  process.exit(1);
}
console.log(`PASS each of the ${frames} frames of a film slow to draw is its own`);
await rm(temp, { recursive: true, force: true });
