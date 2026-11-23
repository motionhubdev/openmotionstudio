// `oms player` and `oms preview`: a film as a folder any static web host plays, without rendering it (ADR 0018). The
// folder holds index.html and player.js, the player (player.ts: the clock, the soundtrack, the controls); frame.js, the
// document the player writes into a sandboxed frame (srcdoc): the Studio's preview core, held still and moved by the
// player, with the film's bundle, its faces and its images in it; and soundtrack.mp4, the film's sounds mixed as its
// MP4's are (mix.ts), so the page sounds as the MP4 does and keeps one clock. The frame's origin is opaque, and a host
// need not let it load anything: it loads nothing. Its scripts run because the player's policy and its own allow
// them by their hashes, and nothing else.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, watch } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join } from 'node:path';
import type { FilmInfo } from '../desktop/src/shared/preview';
import { spokenSound } from '../desktop/src/shared/sound';
import { FACES } from '../desktop/src/main/film/film';
import { MIX_FORMAT, mixFinish, mixSounds, soundInputs } from '../desktop/src/main/film/mix';
import { TYPES, safePreviewFile, within } from '../desktop/src/main/film/serve';
import { STATE_DIR } from '../desktop/src/main/project';

const FONTS = new Set(['.woff', '.woff2', '.ttf', '.otf']);

/** A file as a data: URL. */
const dataUrl = (type: string, bytes: Buffer) => `data:${type};base64,${bytes.toString('base64')}`;

/** JSON safe inside a <script type="application/json">: no `<` to end it early. */
const embedded = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Text safe inside a <script> element: nothing in it ends the element or opens a comment that would hide its end. */
export const scriptText = (text: string) => text.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

/** A script's hash as a policy allows it. */
const hashOf = (text: string) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/**
 * The film's bundle with each file it imports but sounds (`"build/<file>"`: faces, images) as a data: URL, and the
 * motions' faces stylesheet with its faces (`url(/project/…)`) the same, read by `projectFile`.
 */
export async function inlineFiles(script: string, css: string, files: { name: string; bytes: Buffer }[], projectFile: (path: string) => Promise<Buffer | null>) {
  for (const { name, bytes } of files) script = script.split(JSON.stringify(`build/${name}`)).join(JSON.stringify(dataUrl(TYPES[extname(name).toLowerCase()]!, bytes)));
  const urls = [...css.matchAll(/url\((['"]?)\/project\/([^'")]+)\1\)/g)];
  for (const [whole, , path] of urls) {
    const bytes = await projectFile(decodeURIComponent(path!));
    if (!bytes) throw new Error(`A motion's face is not in the project: ${path}.`);
    css = css.replace(whole, `url(${dataUrl(TYPES[extname(path!).toLowerCase()] ?? 'font/woff2', bytes)})`);
  }
  return { script, css };
}

/**
 * The frame's document and the hashes of its two scripts: the film's bundle, run by the core once it provides React and
 * the runtime (`window.__omsInline`), then the core. Its policy lets it load nothing but its own data.
 */
export function framePage(core: string, film: string, css: string, voice: unknown): { html: string; hashes: string[] } {
  const bundle = scriptText(`window.__omsInline = () => {\n${film}\n;return __omsFilm;};`);
  const preview = scriptText(core);
  const hashes = [hashOf(bundle), hashOf(preview)];
  const policy = [
    "default-src 'none'",
    `script-src ${hashes.join(' ')}`,
    "style-src 'unsafe-inline'",
    'img-src data: blob:',
    'font-src data:',
    'media-src data: blob:',
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
  const html = `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${policy}">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}</style>
<style>${css.replace(/<\/(style)/gi, '<\\/$1')}</style>
</head><body><div id="root"></div><script type="application/json" id="oms-voice">${embedded(voice ?? null)}</script><script>${bundle}</script><script>${preview}</script></body></html>
`;
  return { html, hashes };
}

/** The player's page: what it shows of the film, and player.js, which plays it. */
export const playerPage = (shown: { seconds: number; width: number; height: number; fps: number; title: string; sound: boolean; live: boolean }, frameHashes: string[]): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self' ${frameHashes.join(' ')}; style-src 'unsafe-inline'; media-src 'self' data: blob:; connect-src 'self'; img-src 'self' data: blob:; font-src data:; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(shown.title)}</title>
<style>
html, body { margin: 0; height: 100%; overflow: hidden; background: #000; }
#player, .shell { position: fixed; inset: 0; }
.shell.idle.playing { cursor: none; }
.frame { position: absolute; left: 50%; top: 50%; transform-origin: 50% 50%; overflow: hidden; }
.frame iframe { display: block; border: 0; background: transparent; }
.cover { position: absolute; inset: 0; cursor: pointer; }
button { font: inherit; color: inherit; }
button:focus-visible, .scrub:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
[hidden] { display: none !important; }
.bar { position: absolute; left: 0; right: 0; bottom: 0; padding: 36px 14px 8px; display: flex; flex-direction: column; gap: 4px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.62)); color: #fff; font: 500 13px/1 system-ui, -apple-system, 'Segoe UI', sans-serif;
  opacity: 1; transition: opacity 0.25s ease; }
.shell.idle.playing .bar { opacity: 0; pointer-events: none; }
.row { display: flex; align-items: center; gap: 4px; }
.row .gap { flex: 1; }
.row button { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 8px; background: transparent; cursor: pointer; }
.row button:hover { background: rgba(255, 255, 255, 0.16); }
.time { margin-left: 6px; font-variant-numeric: tabular-nums; }
.time span { opacity: 0.7; }
.scrub { --p: 0%; width: 100%; height: 16px; margin: 0; background: transparent; cursor: pointer; -webkit-appearance: none; appearance: none; }
.scrub::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(90deg, #fff var(--p), rgba(255, 255, 255, 0.32) var(--p)); transition: height 0.12s; }
.scrub:hover::-webkit-slider-runnable-track { height: 6px; }
.scrub::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; margin-top: -5px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4); }
.scrub:hover::-webkit-slider-thumb { margin-top: -4px; }
.scrub::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.32); }
.scrub::-moz-range-progress { height: 4px; border-radius: 2px; background: #fff; }
.scrub::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 50%; background: #fff; }
.big { position: absolute; left: 50%; top: 50%; width: 76px; height: 76px; margin: -38px 0 0 -38px; display: grid; place-items: center; padding: 0 0 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 50%; background: rgba(0, 0, 0, 0.5); color: #fff; cursor: pointer;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); transition: transform 0.15s ease, background 0.15s ease; }
.big:hover { transform: scale(1.06); background: rgba(0, 0, 0, 0.65); }
.big svg { width: 34px; height: 34px; }
.chip { position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px 0 10px; border: 0; border-radius: 17px;
  background: rgba(0, 0, 0, 0.6); color: #fff; font: 500 13px/1 system-ui, sans-serif; cursor: pointer; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.chip svg { width: 18px; height: 18px; }
.spin { position: absolute; left: 50%; top: 50%; width: 40px; height: 40px; margin: -20px 0 0 -20px; border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; pointer-events: none; }
@keyframes spin { to { transform: rotate(360deg); } }
.notice { position: absolute; top: 12px; left: 12px; max-width: min(520px, calc(100% - 24px)); padding: 10px 12px; border-radius: 8px;
  background: rgba(0, 0, 0, 0.72); color: #fff; font: 500 13px/1.4 system-ui, sans-serif; }
</style></head>
<body><div id="player"></div><script type="application/json" id="oms-film">${embedded(shown)}</script><script src="player.js"></script></body></html>
`;

/** The project's narration as the preview core reads it from voice/ (core.tsx, `spoken`), or null when it has none. */
async function narrationOf(dir: string): Promise<unknown> {
  const read = async (name: string) => {
    const file = await safePreviewFile(dir, `voice/${name}`, true).catch(() => null);
    return file ? (JSON.parse(await readFile(file, 'utf8')) as unknown) : null;
  };
  const narration = (await read('lines.json')) as { voice: string; lines: Record<string, string> } | null;
  if (!narration) return null;
  const lines: Record<string, unknown> = {};
  for (const [id, key] of Object.entries(narration.lines ?? {})) {
    if (!/^[0-9a-f]{16}$/.test(key)) continue;
    const clip = await read(`${key}.json`);
    if (clip) lines[id] = { key, ...(clip as object) };
  }
  return { voice: narration.voice, lines };
}

const run = (ffmpeg: string, args: string[]) =>
  new Promise<void>((done, fail) =>
    execFile(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { timeout: 600_000, windowsHide: true }, (error, _out, stderr) =>
      error ? fail(new Error(`ffmpeg could not encode the soundtrack: ${String(stderr).trim() || error.message}`)) : done(),
    ),
  );

/**
 * Writes the player of the film built in `output` (its build 1) into `out`, which must not hold anything yet: index.html,
 * player.js from `scripts`, frame.js (the frame's document, with the preview core from `scripts`, the bundle and every
 * file it imports but sounds), and its sounds and narration as soundtrack.mp4, mixed in `work` by `ffmpeg` (asked for
 * only when the film has a sound).
 */
export async function writePlayer(
  dir: string,
  output: string,
  film: FilmInfo,
  out: string,
  { scripts, work, ffmpeg, title, live = false }: { scripts: { core: string; player: string }; work: string; ffmpeg: () => Promise<string>; title: string; live?: boolean },
): Promise<{ soundtrack: boolean }> {
  if (existsSync(out) && (await readdir(out)).length) throw new Error(`${out} is not empty: give the player a new folder.`);
  await mkdir(out, { recursive: true });
  const built = (await readdir(output, { withFileTypes: true })).filter((entry) => entry.isFile()).map((entry) => entry.name);
  // What the bundle imports but sounds, which are in the soundtrack.
  const imported = built.filter((name) => !/^film(-\d+)?\.js$/.test(name) && name !== FACES && TYPES[extname(name).toLowerCase()] && !TYPES[extname(name).toLowerCase()]!.startsWith('audio/'));
  const files = await Promise.all(imported.map(async (name) => ({ name, bytes: await readFile(join(output, name)) })));
  const css = existsSync(join(output, FACES)) ? await readFile(join(output, FACES), 'utf8') : '';
  const projectFile = async (path: string) => {
    const file = await safePreviewFile(dir, path, true).catch(() => null);
    return file ? readFile(file) : null;
  };
  const inlined = await inlineFiles(await readFile(join(output, 'film-1.js'), 'utf8'), css, files, projectFile);
  // Without its source map, which carries the film's source and would double the download.
  const bundle = inlined.script.replace(/\n\/\/# sourceMappingURL=data:[^\n]*\n?$/, '\n');
  const frame = framePage(await readFile(scripts.core, 'utf8'), bundle, inlined.css, await narrationOf(dir));
  await writeFile(join(out, 'frame.js'), `window.__omsFrame = ${JSON.stringify(frame.html)};\n`);
  await copyFile(scripts.player, join(out, 'player.js'));

  const seconds = Math.round(film.seconds * film.fps) / film.fps;
  const sounds = [...film.sounds, ...film.narration.map(spokenSound)];
  let soundtrack = false;
  if (sounds.length) {
    const encoder = await ffmpeg();
    await mkdir(work, { recursive: true });
    const mix = await mixSounds(await soundInputs(dir, encoder, sounds, output), seconds, encoder, work, film.narration);
    if (mix) {
      await run(encoder, [...MIX_FORMAT, '-i', mix, '-af', mixFinish(seconds), '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', join(out, 'soundtrack.mp4')]);
      soundtrack = true;
    }
  }
  await writeFile(join(out, 'index.html'), playerPage({ seconds, width: film.width, height: film.height, fps: film.fps, title, sound: soundtrack, live }, frame.hashes));
  return { soundtrack };
}

/**
 * Serves the player folder `root()` on 127.0.0.1:`port`, as a static host would: its files, ranges of them for the
 * soundtrack, nothing else. `__built` is a stream of events, one each time `built()` is called, for a live page.
 */
export function servePlayer(root: () => string, port: number): { server: Server; built: () => void } {
  const watchers = new Set<import('node:http').ServerResponse>();
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (path === '/__built') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
      response.write(': built\n\n');
      watchers.add(response);
      request.on('close', () => watchers.delete(response));
      return;
    }
    const file = within(root(), path === '/' ? 'index.html' : path.slice(1));
    const info = file ? await stat(file).catch(() => null) : null;
    if (!file || !info?.isFile()) {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
      return;
    }
    const type = extname(file) === '.html' ? 'text/html; charset=utf-8' : (TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
    const body = await readFile(file);
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '');
    const headers = { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
      if (start > end || start >= body.length) {
        response.writeHead(416, { ...headers, 'content-range': `bytes */${body.length}` }).end();
        return;
      }
      response.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${body.length}`, 'content-length': end - start + 1 }).end(body.subarray(start, end + 1));
      return;
    }
    response.writeHead(200, { ...headers, 'content-length': body.length }).end(body);
  });
  server.listen(port, '127.0.0.1');
  return { server, built: () => watchers.forEach((watcher) => watcher.write('data: built\n\n')) };
}

/** Calls `changed` a moment after a file in the project changes, but in the Studio's, Git's or packages' folders. */
export function watchProject(dir: string, changed: () => void): () => void {
  let timer: NodeJS.Timeout | undefined;
  const watcher = watch(dir, { recursive: true }, (_event, name) => {
    const first = String(name ?? '').split(/[\\/]/)[0];
    if (first === STATE_DIR || first === '.git' || first === 'node_modules') return;
    clearTimeout(timer);
    timer = setTimeout(changed, 300);
  });
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}

/** Removes a folder the preview wrote, once nothing is served from it. */
export const removeBuilt = (folder: string) => rm(folder, { recursive: true, force: true });
