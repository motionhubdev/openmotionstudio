import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FilmInfo } from '../../desktop/src/shared/preview';
import { createHash } from 'node:crypto';
import { framePage, inlineFiles, playerPage, scriptText, servePlayer, writePlayer } from '../web';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-web-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const film: FilmInfo = {
  seconds: 2,
  width: 1280,
  height: 720,
  fps: 30,
  scenes: [],
  layers: [],
  sounds: [],
  captions: false,
  voice: null,
  narration: [],
  speech: {},
};

/** A film's build as buildFilmOnce leaves it: the bundle, an image, a face and two clips it imports, the motions' faces. */
async function built() {
  const project = join(dir, 'project');
  const output = join(dir, 'build');
  await mkdir(join(project, 'motions/@a/look/react/fonts'), { recursive: true });
  await writeFile(join(project, 'motions/@a/look/react/fonts/serif.woff2'), 'SERIF');
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'film-1.js'), 'var face = "build/face-AB12.woff2"; var shot = "build/shot-CD34.png"; var take = "build/take-GH78.mov"; var screen = "build/screen-IJ90.webm";\n//# sourceMappingURL=data:application/json;base64,e30=\n');
  await writeFile(join(output, 'film.js'), 'the same build, by another name');
  await writeFile(join(output, 'face-AB12.woff2'), 'FACE');
  await writeFile(join(output, 'shot-CD34.png'), 'PNG');
  await writeFile(join(output, 'beep-EF56.mp3'), 'MP3');
  await writeFile(join(output, 'take-GH78.mov'), 'MOV');
  await writeFile(join(output, 'screen-IJ90.webm'), 'WEBM');
  await writeFile(join(output, 'fonts.css'), "@font-face { font-family: 'Serif'; src: url('/project/motions/@a/look/react/fonts/serif.woff2') format('woff2'); }\n");
  const scripts = { core: join(dir, 'core.js'), player: join(dir, 'player.js') };
  await writeFile(scripts.core, 'CORE');
  await writeFile(scripts.player, 'PLAYER');
  return { project, output, scripts };
}

describe('the web player of a film', () => {
  it('writes the player, its script, the frame with everything it shows in it, and nothing of the project else', async () => {
    const { project, output, scripts } = await built();
    const out = join(dir, 'web');
    const ffmpeg = () => Promise.reject(new Error('a film without sounds needs no ffmpeg'));
    await expect(writePlayer(project, output, film, out, { scripts, work: join(dir, 'mix'), ffmpeg, title: 'Sky <blue>' })).resolves.toEqual({ soundtrack: false });
    expect((await readdir(out)).sort()).toEqual(['clips', 'frame.js', 'index.html', 'player.js']);
    // Each clip is a file of its own, named by its bytes' hash, a MOV as the MP4 a host serves and Chromium plays it as.
    const named = (bytes: string, ext: string) => `clips/${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}${ext}`;
    const take = named('MOV', '.mp4');
    const screen = named('WEBM', '.webm');
    expect((await readdir(join(out, 'clips'))).sort()).toEqual([take, screen].map((path) => path.slice('clips/'.length)).sort());
    expect(await readFile(join(out, take), 'utf8')).toBe('MOV');
    expect(await readFile(join(out, screen), 'utf8')).toBe('WEBM');
    const frameJs = await readFile(join(out, 'frame.js'), 'utf8');
    expect(frameJs.startsWith('window.__omsFrame = "')).toBe(true);
    const html = JSON.parse(frameJs.slice('window.__omsFrame = '.length, -2)) as string;
    // The face and the image it imports are in the bundle; the sound would be in the soundtrack; the motion's face in its style.
    expect(html).toContain(`"data:font/woff2;base64,${Buffer.from('FACE').toString('base64')}"`);
    expect(html).toContain(`"data:image/png;base64,${Buffer.from('PNG').toString('base64')}"`);
    expect(html).not.toContain('build/beep-EF56.mp3"');
    // The bundle names its clips by their paths beside the page, and carries none of their bytes.
    expect(html).toContain(`var take = ${JSON.stringify(take)}; var screen = ${JSON.stringify(screen)};`);
    expect(html).not.toContain(Buffer.from('MOV').toString('base64'));
    expect(html).not.toMatch(/data:video\//);
    expect(html).not.toContain('sourceMappingURL');
    expect(html).toContain(`url(data:font/woff2;base64,${Buffer.from('SERIF').toString('base64')})`);
    expect(html).toContain('<script type="application/json" id="oms-voice">null</script>');
    // Its two scripts are the bundle, run by the core, and the core; the player's policy allows exactly those.
    const scriptsIn = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(scriptsIn).toHaveLength(2);
    expect(scriptsIn[0]).toMatch(/^window\.__omsInline = \(\) => \{\nvar face = /);
    expect(scriptsIn[1]).toBe('CORE');
    const hashes = scriptsIn.map((text) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`);
    const player = await readFile(join(out, 'index.html'), 'utf8');
    expect(player).toContain(`script-src 'self' ${hashes.join(' ')};`);
    expect(html).toContain(`script-src ${hashes.join(' ')};`);
    expect(player).toContain('<title>Sky &#60;blue&#62;</title>');
    expect(player).toContain(`{"seconds":2,"width":1280,"height":720,"fps":30,"title":"Sky \\u003cblue>","sound":false,"live":false,"clips":${JSON.stringify([take, screen].sort())}}`);
  });

  it('never writes into a folder that holds anything', async () => {
    const { project, output, scripts } = await built();
    const out = join(dir, 'web');
    await mkdir(out);
    await writeFile(join(out, 'keep.txt'), 'mine');
    await expect(writePlayer(project, output, film, out, { scripts, work: join(dir, 'mix'), ffmpeg: async () => 'ffmpeg', title: 'x' })).rejects.toThrow('is not empty');
    expect(await readdir(out)).toEqual(['keep.txt']);
  });

  it("refuses a motion's face that is not in the project", async () => {
    await expect(inlineFiles('', "src: url('/project/motions/@a/gone.woff2')", [], async () => null)).rejects.toThrow('not in the project: motions/@a/gone.woff2');
  });

  it('gives the frame a policy that loads nothing, and text that cannot end its elements early', () => {
    const { html } = framePage('var core = "</script><!--";', 'var x = "</SCRIPT>";', '</style><script>', { lines: { a: { text: '</script><script>alert(1)' } } });
    expect(html).toContain("default-src 'none'; script-src 'sha256-");
    expect(html).not.toMatch(/connect-src|'self'/);
    expect(html.match(/<\/script>/g)).toHaveLength(3);
    expect(html).not.toContain('</style><script>');
    expect(scriptText('a</script>b<!--c')).toBe('a<\\/script>b<\\!--c');
  });

  it("names the player's own sources and the frame's scripts, and nothing else", () => {
    const page = playerPage({ seconds: 1, width: 10, height: 10, fps: 30, title: 't', sound: true, live: false, clips: [] }, ["'sha256-a'", "'sha256-b'"]);
    expect(page).toContain("default-src 'none'; script-src 'self' 'sha256-a' 'sha256-b'; style-src 'unsafe-inline'; media-src 'self' data: blob:; connect-src 'self'");
    expect(page).toContain('<script src="player.js"></script>');
  });
});

describe('the preview server', () => {
  it('serves the folder as a static host does: files, ranges of them, nothing outside it', async () => {
    const root = join(dir, 'web');
    await mkdir(root);
    await writeFile(join(root, 'index.html'), '<p>player</p>');
    await writeFile(join(root, 'soundtrack.mp4'), '0123456789');
    await writeFile(join(dir, 'secret.txt'), 'not served');
    const { server } = servePlayer(() => root, 0);
    await new Promise((done) => server.once('listening', done));
    const { port } = server.address() as { port: number };
    const get = (path: string, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${port}${path}`, { headers });
    try {
      const page = await get('/');
      expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(await page.text()).toBe('<p>player</p>');
      const part = await get('/soundtrack.mp4', { range: 'bytes=2-5' });
      expect(part.status).toBe(206);
      expect(part.headers.get('content-range')).toBe('bytes 2-5/10');
      expect(await part.text()).toBe('2345');
      expect((await get('/soundtrack.mp4', { range: 'bytes=20-' })).status).toBe(416);
      expect((await get('/%2e%2e/secret.txt')).status).toBe(404);
      expect((await get('/missing.js')).status).toBe(404);
    } finally {
      await new Promise((done) => server.close(done));
    }
  });
});
