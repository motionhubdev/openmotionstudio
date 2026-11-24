// A project as one file, `.oms` (ADR 0019): its folder's own files in a gzipped ustar tar, as a motion's package is on
// motionhub, with fixed owner, mode and time so the same files always give the same bytes. `oms pack` writes one, and
// the Studio's Import takes one into a new folder in the workspace. Left out: the Studio's state, git's, installed
// packages, and what a project ignores at its top (a render, its subtitles, stills).

import { lstat, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { Project } from '../shared/api';
import { STATE_DIR, createInWorkspace, ignore, openProject, projectAt } from './project';

export const OMS_EXTENSION = '.oms';
/** Most bytes a project takes in or out, unpacked: a film's media, not a video library. */
export const MOST_BYTES = 1024 ** 3;
/** Most files one holds. */
const MOST_FILES = 20_000;
/** Folders never packed, wherever they are. */
const SKIPPED = new Set(['.git', 'node_modules', STATE_DIR, '.DS_Store', 'Thumbs.db']);
/** What `oms init`'s .gitignore leaves out at the top (renders, their subtitles and stills), and film files packed there. */
const EXPORTS = /^[^/]+\.(mp4|srt|png|oms)$/i;

/** The project's files, by path relative to it with `/`, A to Z; a link is refused, since what it points at is not the project's. */
export async function packedFiles(dir: string, prefix = ''): Promise<string[]> {
  const found: string[] = [];
  const entries = (await readdir(join(dir, prefix), { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const path = `${prefix}${entry.name}`;
    if (SKIPPED.has(entry.name) || EXPORTS.test(path)) continue;
    if (entry.isSymbolicLink()) throw new Error(`${path} is a link: a packed film holds the project's own files, so copy it in instead.`);
    if (entry.isDirectory()) found.push(...(await packedFiles(dir, `${path}/`)));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

/** A ustar header field: text or an octal number, NUL-padded to its width. */
function field(header: Buffer, at: number, width: number, value: string | number): void {
  header.write(typeof value === 'number' ? value.toString(8).padStart(width - 1, '0') : value, at, width, 'utf8');
}

/** The project in `dir` as an .oms file's bytes, and how many files it holds. */
export async function packProject(dir: string): Promise<{ bytes: Buffer; files: number }> {
  const paths = await packedFiles(dir);
  if (!paths.includes('film.tsx')) throw new Error(`${dir} holds no film.tsx: name the project folder.`);
  if (paths.length > MOST_FILES) throw new Error(`The project holds ${paths.length} files, more than ${MOST_FILES}.`);
  const blocks: Buffer[] = [];
  let total = 0;
  for (const path of paths) {
    const data = await readFile(join(dir, path));
    total += data.length;
    if (total > MOST_BYTES) throw new Error(`The project holds more than ${MOST_BYTES / 1024 ** 3} GB: leave its large media out of the folder.`);
    const header = Buffer.alloc(512);
    let [prefix, name] = ['', path];
    if (Buffer.byteLength(path) > 100) {
      const cut = path.lastIndexOf('/');
      [prefix, name] = [path.slice(0, cut), path.slice(cut + 1)];
      if (cut < 0 || Buffer.byteLength(prefix) > 155 || Buffer.byteLength(name) > 100) throw new Error(`${path}: the path is too long to pack.`);
    }
    field(header, 0, 100, name);
    field(header, 100, 8, 0o644);
    field(header, 108, 8, 0);
    field(header, 116, 8, 0);
    field(header, 124, 12, data.length);
    field(header, 136, 12, 0);
    header.fill(' ', 148, 156);
    header.write('0', 156);
    header.write('ustar\u000000', 257, 8, 'latin1');
    field(header, 345, 155, prefix);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, '0')}\u0000 `, 148, 8, 'latin1');
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return { bytes: gzipSync(Buffer.concat(blocks), { level: 9 }), files: paths.length };
}

/** A path an .oms file may hold: relative, in plain parts, nowhere the Studio keeps its state. */
const safePath = (path: string): boolean =>
  !/[\\:\0-\x1f]/.test(path) && path.split('/').every((part) => part && part !== '.' && part !== '..') && path.split('/')[0] !== STATE_DIR;

/** The files an .oms file holds, by path, checked: its bytes are anyone's. */
export async function unpackedFiles(bytes: Buffer): Promise<Map<string, Buffer>> {
  let tar: Buffer;
  try {
    tar = gunzipSync(bytes, { maxOutputLength: MOST_BYTES + 1024 * 1024 });
  } catch (error) {
    throw new Error((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE' ? `The film file unpacks to more than ${MOST_BYTES / 1024 ** 3} GB.` : 'This is not a film file (.oms).');
  }
  const { untar } = await import('@motionhub/cli/hub');
  const files = new Map<string, Buffer>();
  try {
    // A tar made by hand from inside the folder names its files ./film.tsx.
    for (const [path, data] of untar(tar)) files.set(path.replace(/^(\.\/)+/, ''), data);
  } catch (error) {
    throw new Error(`This film file is damaged: ${(error as Error).message}.`);
  }
  if (files.size > MOST_FILES) throw new Error(`The film file holds more than ${MOST_FILES} files.`);
  for (const path of files.keys()) if (!safePath(path)) throw new Error(`The film file holds a file outside its project: ${path}`);
  if (!files.has('film.tsx')) throw new Error('The film file holds no film.tsx.');
  return files;
}

/**
 * Takes the .oms file at `file` into a new folder in `workspace`, named after the file, and returns the project. A file
 * refused, or one that fails part way, leaves no folder behind.
 */
export async function importProject(file: string, workspace: string): Promise<Project> {
  if (!file.toLowerCase().endsWith(OMS_EXTENSION)) throw new Error('Choose a film file (.oms).');
  if ((await lstat(file)).size > MOST_BYTES) throw new Error(`The film file is larger than ${MOST_BYTES / 1024 ** 3} GB.`);
  const files = await unpackedFiles(await readFile(file));
  const project = await createInWorkspace(workspace, basename(file).slice(0, -OMS_EXTENSION.length));
  try {
    for (const [path, data] of files) {
      await mkdir(dirname(join(project.path, path)), { recursive: true });
      await writeFile(join(project.path, path), data);
    }
    // The packed .gitignore may be the person's own, without the Studio's state in it.
    await ignore(project.path, [`${STATE_DIR}/`]);
  } catch (error) {
    // The folder was made empty a moment ago: what is in it came from the file.
    await rm(project.path, { recursive: true, force: true });
    throw error;
  }
  return projectAt(project.path);
}

/**
 * The project the person picked to import: a film file taken into the workspace, or a project folder (or the film.tsx
 * in one, as a dialog that picks only files gives it) opened where it is.
 */
export async function takeProject(picked: string, workspace: string): Promise<Project> {
  if (picked.toLowerCase().endsWith(OMS_EXTENSION)) return importProject(picked, workspace);
  if ((await stat(picked)).isDirectory()) return openProject(picked);
  if (basename(picked) === 'film.tsx') return openProject(dirname(picked));
  throw new Error("Choose a project folder (or the film.tsx in it), or a film file (.oms).");
}

/**
 * The film files among a launch's arguments, as Windows and Linux pass a double-clicked one: `argv` is the program's
 * (or a second launch's), and a relative path is taken from `cwd`, where that launch started. Switches are not files.
 */
export function filmFilesIn(argv: readonly string[], cwd: string): string[] {
  return argv.filter((arg) => !arg.startsWith('-') && arg.toLowerCase().endsWith(OMS_EXTENSION)).map((arg) => resolve(cwd, arg));
}

/**
 * Takes film files the system hands the Studio one after another, holding those that arrive before it can open them
 * (a cold start's, which come before its window) until `start`. `open` reports its own failures; one that still
 * rejects goes to `failed` and the next file is opened all the same.
 */
export function filmFileQueue(open: (file: string) => Promise<void>, failed: (error: unknown) => void): { add(files: readonly string[]): void; start(): void } {
  let held: string[] | null = [];
  let last = Promise.resolve();
  const take = (file: string) => { last = last.then(() => open(file)).catch(failed); };
  return {
    add(files) { if (held) held.push(...files); else files.forEach(take); },
    start() { const waiting = held ?? []; held = null; waiting.forEach(take); },
  };
}
