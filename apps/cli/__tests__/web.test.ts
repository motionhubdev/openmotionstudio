import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FilmInfo } from '../../desktop/src/shared/preview';
import { filmPage, inlineFaces, playerPage, servePlayer, writePlayer } from '../web';

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

/** A film's build as buildFilmOnce leaves it: the bundle, an image and a face it imports, the motions' faces. */
async function built() {
  const project = join(dir, 'project');
  const output = join(dir, 'build');
  await mkdir(join(project, 'motions/@a/look/react/fonts'), { recursive: true });
  await writeFile(join(project, 'motions/@a/look/react/fonts/serif.woff2'), 'SERIF');
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'film-1.js'), 'var face = "build/face-AB12.woff2"; var shot = "build/shot-CD34.png";\n//# sourceMappingURL=data:application/json;base64,e30=\n');
  await writeFile(join(output, 'film.js'), 'the same build, by another name');
  await writeFile(join(output, 'face-AB12.woff2'), 'FACE');
  await writeFile(join(output, 'shot-CD34.png'), 'PNG');
  await writeFile(join(output, 'beep-EF56.mp3'), 'MP3');
  await writeFile(join(output, 'fonts.css'), "@font-face { font-family: 'Serif'; src: url('/project/motions/@a/look/react/fonts/serif.woff2') format('woff2'); }\n");
  const scripts = { core: join(dir, 'core.js'), player: join(dir, 'player.js') };
  await writeFile(scripts.core, 'CORE');
  await writeFile(scripts.player, 'PLAYER');
  return { project, output, scripts };
}

describe('the web player of a film', () => {
  it('writes the pages, the scripts, the bundle and what it shows, and nothing of the project else', async () => {
    const { project, output, scripts } = await built();
    const out = join(dir, 'web');
    const ffmpeg = () => Promise.reject(new Error('a film without sounds needs no ffmpeg'));
    await expect(writePlayer(project, output, film, out, { scripts, work: join(dir, 'mix'), ffmpeg, title: 'Sky <blue>' })).resolves.toEqual({ soundtrack: false });
    expect((await readdir(out)).sort()).toEqual(['build', 'film.html', 'index.html', 'player.js', 'studio']);
    // Faces are in the bundle and the stylesheet; sounds would be in the soundtrack: neither is a file of its own.
    expect((await readdir(join(out, 'build'))).sort()).toEqual(['film-1.js', 'fonts.css', 'shot-CD34.png']);
    const script = await readFile(join(out, 'build/film-1.js'), 'utf8');
    expect(script).toContain(`"data:font/woff2;base64,${Buffer.from('FACE').toString('base64')}"`);
    expect(script).toContain('"build/shot-CD34.png"');
    expect(script).not.toContain('sourceMappingURL');
    expect(await readFile(join(out, 'build/fonts.css'), 'utf8')).toContain(`url(data:font/woff2;base64,${Buffer.from('SERIF').toString('base64')})`);
    const page = await readFile(join(out, 'film.html'), 'utf8');
    expect(page).toContain('<link rel="preload" as="image" href="build/shot-CD34.png">');
    expect(page).toContain('<script type="application/json" id="oms-voice">null</script>');
    const player = await readFile(join(out, 'index.html'), 'utf8');
    expect(player).toContain('<title>Sky &#60;blue&#62;</title>');
    expect(player).toContain('{"seconds":2,"width":1280,"height":720,"fps":30,"title":"Sky \\u003cblue>","sound":false,"live":false}');
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
    await expect(inlineFaces('', "src: url('/project/motions/@a/gone.woff2')", [], async () => null)).rejects.toThrow('not in the project: motions/@a/gone.woff2');
  });

  it("gives the frame the film's own policy and a narration that cannot end its script element", () => {
    const page = filmPage([], { voice: 'v', lines: { a: { text: '</script><script>alert(1)' } } });
    expect(page).toContain("default-src 'none'; script-src 'self'");
    expect(page).toContain("connect-src 'self'");
    expect(page).not.toContain('</script><script>alert');
    expect(page).toContain('\\u003c/script>');
  });

  it("frames the film with no rights but its scripts', and names the player's own sources", () => {
    const page = playerPage({ seconds: 1, width: 10, height: 10, fps: 30, title: 't', sound: true, live: false });
    expect(page).toContain("default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; frame-src 'self'; media-src 'self'");
    expect(page).toContain('<script src="player.js"></script>');
  });
});

describe('the preview server', () => {
  it('serves the folder as a static host does: files, ranges of them, nothing outside it', async () => {
    const root = join(dir, 'web');
    await mkdir(root);
    await writeFile(join(root, 'index.html'), '<p>player</p>');
    await writeFile(join(root, 'soundtrack.m4a'), '0123456789');
    await writeFile(join(dir, 'secret.txt'), 'not served');
    const { server } = servePlayer(() => root, 0);
    await new Promise((done) => server.once('listening', done));
    const { port } = server.address() as { port: number };
    const get = (path: string, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${port}${path}`, { headers });
    try {
      const page = await get('/');
      expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(await page.text()).toBe('<p>player</p>');
      const part = await get('/soundtrack.m4a', { range: 'bytes=2-5' });
      expect(part.status).toBe(206);
      expect(part.headers.get('content-range')).toBe('bytes 2-5/10');
      expect(await part.text()).toBe('2345');
      expect((await get('/soundtrack.m4a', { range: 'bytes=20-' })).status).toBe(416);
      expect((await get('/%2e%2e/secret.txt')).status).toBe(404);
      expect((await get('/missing.js')).status).toBe(404);
    } finally {
      await new Promise((done) => server.close(done));
    }
  });
});
