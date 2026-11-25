import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { filmFileQueue, filmFilesIn, importProject, packProject, packedFiles, takeProject, unpackedFiles } from '../oms-file';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-file-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

/** Writes `files` (path → text) under `root`. */
async function project(root: string, files: Record<string, string>): Promise<string> {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

/** A gzipped ustar tar of `entries` as any tool might write one, unchecked: what an .oms file from anyone may hold. */
function tarOf(entries: [string, string, string?][]): Buffer {
  const blocks: Buffer[] = [];
  for (const [path, text, type = '0'] of entries) {
    const data = Buffer.from(text);
    const header = Buffer.alloc(512);
    header.write(path, 0, 100);
    header.write(data.length.toString(8).padStart(11, '0'), 124);
    header.write(type, 156);
    header.write('ustar\u000000', 257, 8, 'latin1');
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

const FILM = { 'film.tsx': 'export default 1;', 'parts/kit.tsx': 'kit', 'media/fonts/a.ttf': 'font', 'media/poster.png': 'png', 'voice/lines.json': '{}', '.gitignore': '/*.mp4\n' };

describe('packing a project', () => {
  it("holds the project's own files and leaves out the Studio's state, git's, packages and its renders", async () => {
    const root = await project(join(dir, 'p'), {
      ...FILM,
      'film.mp4': 'render',
      'film.srt': 'subtitles',
      'still.png': 'still',
      '.motion-studio/session.json': 'conversation',
      '.git/HEAD': 'ref',
      'node_modules/x/index.js': 'x',
    });
    expect(await packedFiles(root)).toEqual(['.gitignore', 'film.tsx', 'media/fonts/a.ttf', 'media/poster.png', 'parts/kit.tsx', 'voice/lines.json']);
    const { bytes, files } = await packProject(root);
    expect(files).toBe(6);
    const back = await unpackedFiles(bytes);
    expect([...back.keys()].sort()).toEqual(['.gitignore', 'film.tsx', 'media/fonts/a.ttf', 'media/poster.png', 'parts/kit.tsx', 'voice/lines.json']);
    expect(back.get('media/fonts/a.ttf')!.toString()).toBe('font');
  });

  it('leaves out every folder whose name starts with a dot, and says which a person may not expect, with its bytes', async () => {
    const root = await project(join(dir, 'p'), {
      ...FILM,
      '.data-cache/tiles/a.tif': 'x'.repeat(3000),
      '.data-cache/b.json': 'x'.repeat(100),
      'parts/.vscode/settings.json': '{}',
      '.git/HEAD': 'ref',
      '.motion-studio/session.json': 'conversation',
      'media/.keep': '',
    });
    const { files, leftOut } = await packProject(root);
    expect(await packedFiles(root)).toEqual(['.gitignore', 'film.tsx', 'media/.keep', 'media/fonts/a.ttf', 'media/poster.png', 'parts/kit.tsx', 'voice/lines.json']);
    expect(files).toBe(7);
    expect(leftOut).toEqual([{ path: '.data-cache/', bytes: 3100 }, { path: 'parts/.vscode/', bytes: 2 }]);
  });

  it('gives the same bytes for the same files, whenever they were written', async () => {
    const one = await project(join(dir, 'one'), FILM);
    const two = await project(join(dir, 'two'), FILM);
    expect((await packProject(one)).bytes.equals((await packProject(two)).bytes)).toBe(true);
  });

  it('refuses a folder with no film, and a link to anything outside it', async () => {
    await expect(packProject(await project(join(dir, 'empty'), { 'notes.md': 'x' }))).rejects.toThrow('holds no film.tsx');
    const root = await project(join(dir, 'linked'), FILM);
    await symlink(join(dir, 'empty'), join(root, 'media', 'outside'));
    await expect(packProject(root)).rejects.toThrow('media/outside is a link');
  });

  it('keeps a path longer than a tar name holds', async () => {
    const deep = `media/${'a'.repeat(60)}/${'b'.repeat(60)}.png`;
    const root = await project(join(dir, 'deep'), { 'film.tsx': 'f', [deep]: 'png' });
    expect((await unpackedFiles((await packProject(root)).bytes)).get(deep)!.toString()).toBe('png');
  });
});

describe('reading a film file', () => {
  it('takes a tar made by hand from inside the folder', async () => {
    expect([...(await unpackedFiles(tarOf([['./', '', '5'], ['./film.tsx', 'f']]))).keys()]).toEqual(['film.tsx']);
  });

  it('refuses a file outside the project, in the Studio’s state, a link, no film, or not a film file at all', async () => {
    await expect(unpackedFiles(tarOf([['film.tsx', 'f'], ['../escape.txt', 'x']]))).rejects.toThrow('outside its project: ../escape.txt');
    await expect(unpackedFiles(tarOf([['film.tsx', 'f'], ['/etc/x', 'x']]))).rejects.toThrow('outside its project');
    await expect(unpackedFiles(tarOf([['film.tsx', 'f'], ['C:\\x', 'x']]))).rejects.toThrow('outside its project');
    await expect(unpackedFiles(tarOf([['film.tsx', 'f'], ['.motion-studio/agent.json', '{}']]))).rejects.toThrow('outside its project');
    await expect(unpackedFiles(tarOf([['film.tsx', 'f'], ['media/l', '', '2']]))).rejects.toThrow('damaged');
    await expect(unpackedFiles(tarOf([['notes.md', 'x']]))).rejects.toThrow('no film.tsx');
    await expect(unpackedFiles(Buffer.from('not gzip'))).rejects.toThrow('not a film file');
  });
});

describe('importing a film file', () => {
  it('takes it into a new folder in the workspace named after the file, with the Studio’s state ignored', async () => {
    const file = join(dir, 'Thunder.oms');
    await writeFile(file, (await packProject(await project(join(dir, 'src'), FILM))).bytes);
    const workspace = join(dir, 'workspace');
    const first = await importProject(file, workspace);
    expect(first.path).toBe(join(workspace, 'Thunder'));
    expect(await readFile(join(first.path, 'media/fonts/a.ttf'), 'utf8')).toBe('font');
    expect(await readFile(join(first.path, '.gitignore'), 'utf8')).toBe('/*.mp4\n.motion-studio/\n');
    expect(existsSync(join(first.path, '.motion-studio'))).toBe(true);
    // A second import never touches the first.
    expect((await importProject(file, workspace)).path).toBe(join(workspace, 'Thunder 2'));
  });

  it('leaves nothing in the workspace for a file it refuses', async () => {
    const file = join(dir, 'Bad.oms');
    await writeFile(file, tarOf([['film.tsx', 'f'], ['../escape.txt', 'x']]));
    const workspace = join(dir, 'workspace');
    await mkdir(workspace);
    await expect(importProject(file, workspace)).rejects.toThrow('outside its project');
    expect(await readdir(workspace)).toEqual([]);
    await expect(importProject(join(dir, 'film.zip'), workspace)).rejects.toThrow('Choose a film file (.oms)');
  });
});

describe('importing what the person picked', () => {
  it('opens a folder where it is, by itself or by its film.tsx, and takes a film file into the workspace', async () => {
    const root = await project(join(dir, 'Mine'), FILM);
    const workspace = join(dir, 'workspace');
    expect((await takeProject(root, workspace)).path).toBe(root);
    expect((await takeProject(join(root, 'film.tsx'), workspace)).path).toBe(root);
    const file = join(dir, 'Sent.oms');
    await writeFile(file, (await packProject(root)).bytes);
    expect((await takeProject(file, workspace)).path).toBe(join(workspace, 'Sent'));
    await expect(takeProject(join(root, 'parts', 'kit.tsx'), workspace)).rejects.toThrow('Choose a project folder');
  });
});

describe('film files the system hands the Studio', () => {
  it('takes the .oms paths from a launch, resolved where it started, and nothing else', () => {
    const cwd = resolve('/home/ann');
    expect(filmFilesIn(['--allow-file-access-from-files', '.', 'Moon.OMS', resolve('/films/sun.oms'), 'film.tsx', '--x=a.oms'], cwd))
      .toEqual([resolve(cwd, 'Moon.OMS'), resolve('/films/sun.oms')]);
    expect(filmFilesIn([], cwd)).toEqual([]);
  });

  it('holds files until the Studio starts, then opens each one after the other, past a failure', async () => {
    const events: string[] = [];
    const failures: unknown[] = [];
    let finish!: () => void;
    const done = new Promise<void>((resolve) => { finish = resolve; });
    const queue = filmFileQueue(async (file) => {
      events.push(`start ${file}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      events.push(`end ${file}`);
      if (file === 'b.oms') throw new Error('broken');
      if (file === 'c.oms') finish();
    }, (error) => failures.push(error));
    queue.add(['a.oms']);
    queue.add(['b.oms']);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(events).toEqual([]);
    queue.start();
    queue.add(['c.oms']);
    await done;
    expect(events).toEqual(['start a.oms', 'end a.oms', 'start b.oms', 'end b.oms', 'start c.oms', 'end c.oms']);
    expect(failures).toEqual([new Error('broken')]);
  });
});
