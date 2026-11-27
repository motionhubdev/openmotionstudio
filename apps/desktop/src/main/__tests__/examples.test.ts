import { mkdtemp, readFile, readdir, writeFile, rm, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EXAMPLES, TEMPLATES, openExample } from '../examples';
import { watchFilm } from '../film/film';
vi.mock('electron', () => ({}));
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-examples-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** A folder's files by path (with `/`), sorted. */
async function filesOf(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(folder.length + 1).split('\\').join('/'))
    .sort();
}

it('builds every starting point as a normal film, at the 16:9 frame Home says it has', async () => {
  for (const example of EXAMPLES) {
    const project = await openExample(dir, example.id);
    let built!: (ok: boolean) => void;
    const result = new Promise<boolean>((resolve) => {
      built = resolve;
    });
    const context = await watchFilm(project.path, (r) => built(r.ok));
    try {
      expect(await result, example.id).toBe(true);
    } finally {
      await context.dispose();
    }
    const source = await readFile(join(project.path, 'film.tsx'), 'utf8');
    expect(source, example.id).toContain('width: 1920, height: 1080');
  }
});

it('copies a pristine template folder into a fresh project on every click and preserves earlier edits', async () => {
  const first = await openExample(dir, 'kinetic');
  await writeFile(join(first.path, 'film.tsx'), 'mine');
  const second = await openExample(dir, 'kinetic');
  expect(second.path).not.toBe(first.path);
  expect(second.name).toBe(`${first.name} 2`);
  expect(await readFile(join(first.path, 'film.tsx'), 'utf8')).toBe('mine');
  expect(await readFile(join(second.path, 'film.tsx'), 'utf8')).toBe(await readFile(join(TEMPLATES, 'kinetic', 'film.tsx'), 'utf8'));
  const copied = (await filesOf(second.path)).filter((file) => !file.startsWith('.motion-studio/') && file !== '.gitignore');
  expect(copied).toEqual(await filesOf(join(TEMPLATES, 'kinetic')));
  await expect(openExample(dir, '../escape')).rejects.toThrow('starting points');
});

it('ships a licence beside every face and track a template plays', async () => {
  for (const example of EXAMPLES) {
    const files = await filesOf(join(TEMPLATES, example.id));
    for (const file of files.filter((f) => /^media\/.*\.(woff2|ttf|otf|mp3|wav|m4a|ogg)$/.test(f))) {
      const stem = file.replace(/\.[^.]+$/, '');
      expect(files.some((f) => f !== file && f.startsWith(stem) && f.endsWith('.txt')), `${example.id}/${file}`).toBe(true);
    }
  }
});

it('has each template rendered from its current files, for Home to play', async () => {
  const folder = fileURLToPath(new URL('../../renderer/src/templates/', import.meta.url));
  const manifest = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8')) as Record<string, { seconds: number; files: string }>;
  expect(Object.keys(manifest).sort()).toEqual(EXAMPLES.map((example) => example.id).sort());
  for (const example of EXAMPLES) {
    // The same hash render-templates.mjs takes: each file's path and bytes, in path order.
    const hash = createHash('sha256');
    const root = join(TEMPLATES, example.id);
    for (const file of await filesOf(root)) hash.update(`${file}\0`).update(await readFile(join(root, file))).update('\0');
    // Changed a template? Run `pnpm templates` to render it again.
    expect(manifest[example.id], example.id).toEqual({ seconds: example.seconds, files: hash.digest('hex') });
    for (const kind of ['mp4', 'jpg']) expect((await stat(join(folder, `${example.id}.${kind}`))).size).toBeGreaterThan(0);
  }
});
