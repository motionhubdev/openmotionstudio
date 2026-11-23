// The film (docs/tech/architecture.md, "The film"): `film.tsx` at the project's root, a
// React component that draws a <Film> of <Scene>s from @motionhub/runtime, each of <Layer>s
// and <Line>s; the scenes' durations are its length, and `film` gives its size and rate:
//
//   export const film = {width: 1920, height: 1080, fps: 30};
//   export default function Main() { return <Film><Scene id="intro" duration={4}>…</Scene></Film>; }
//
// The Studio bundles it with esbuild into .motion-studio/build/film.js, leaving React and
// the runtime to the preview core (src/preview/core.tsx) and bundling three.js from its own copy,
// and plays, stills and exports it from there; the faces of the project's motions go beside it in fonts.css.

import type { BuildContext, BuildOptions, Message, Plugin } from 'esbuild';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import type { BuildResult } from '../../shared/api';
import { motionFaces } from '../motions';
import { STATE_DIR } from '../project';
import STARTER from './starter.tsx.txt?raw';
import SKILL from './film.md?raw';
import { log, logFailure } from '../log';

// Load the unpacked API as well as its executable: esbuild resolves its child relative to its own entry point.
// A child process cannot execute a path inside app.asar, even when Electron can read that virtual path.
const require = createRequire(__filename);
const bundlerEntry = require.resolve('esbuild').replace(/([/\\])app\.asar([/\\])/, '$1app.asar.unpacked$2');
log('bundler.load', { entry: bundlerEntry });
const { build, context, formatMessages } = require(bundlerEntry) as typeof import('esbuild');

/** What the agent is told about making a film (film.md). */
export const FILM_SKILL: string = SKILL;

export const FILM = 'film.tsx';
/** Where a project's film is bundled to. A function, so this module reads STATE_DIR only once it is defined. */
export const buildDir = (dir: string): string => join(dir, STATE_DIR, 'build');

/** The stylesheet of the project's motions' faces, beside the bundle (motions.ts motionFaces). */
export const FACES = 'fonts.css';

/** What the preview core provides; everything else a film imports is bundled. */
const PROVIDED = ['react', 'react/jsx-runtime', '@motionhub/runtime'];

/**
 * three.js, which a motion's parts may import with its subpaths (motionhub's SPEC.md, "react/parts"): the Studio's own copy,
 * at the version motionhub's player pins, bundled into a film that imports it. Read from outside app.asar, which esbuild's
 * process cannot read (electron-builder.yml unpacks it); a project's own node_modules does not replace it.
 */
const threeModules = dirname(dirname(dirname(require.resolve('three')))).replace(/([/\\])app\.asar([/\\])/, '$1app.asar.unpacked$2');
const THREE = Symbol('three');
const studioThree: Plugin = {
  name: 'studio-three',
  setup(build) {
    build.onResolve({ filter: /^three(\/|$)/ }, (args) =>
      args.pluginData === THREE ? undefined : build.resolve(args.path, { kind: args.kind, resolveDir: threeModules, pluginData: THREE }),
    );
  },
};

/** The kinds of file a film may import, served beside its bundle. */
const ASSETS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
];

/** Whether a folder holds a film. */
export const hasFilm = (dir: string): boolean => existsSync(join(dir, FILM));


/** Starts a film in the project: writes film.tsx unless there is one. */
export async function startFilm(dir: string): Promise<void> {
  const file = join(dir, FILM);
  if (existsSync(file)) return;
  await writeFile(file, STARTER);
}

export const formatted = async (messages: Message[]): Promise<string[]> =>
  messages.length ? await formatMessages(messages, { kind: 'error', color: false }) : [];

/** An esbuild plugin that numbers each build of `dir` into `output` and reports its errors to `onBuilt`. */
export function reporter(onBuilt: (result: BuildResult) => void, dir: string, output = buildDir(dir)): Plugin {
  let version = 0;
  return {
    name: 'report',
    setup(build) {
      build.onEnd(async (result) => {
        const errors = await formatted(result.errors);
        version++;
        if (!errors.length) {
          await copyFile(join(output, 'film.js'), join(output, `film-${version}.js`));
          // The motions' faces, which the preview page loads before the film; a face that is not one is said, not loaded.
          const faces = await motionFaces(dir);
          for (const reason of faces.skipped) console.warn(`A motion's face was left out: ${reason}`);
          await writeFile(join(output, FACES), faces.css);
        }
        onBuilt({ ok: errors.length === 0, version, errors });
      });
    },
  };
}

/** Files a film may import, served beside its bundle. */
export const ASSET_LOADERS = Object.fromEntries(ASSETS.map((ext) => [ext, 'file' as const]));

function filmOptions(dir: string, output: string, plugins: Plugin[] = []): BuildOptions {
  return {
    absWorkingDir: dir,
    entryPoints: [FILM],
    outfile: join(output, 'film.js'),
    bundle: true,
    format: 'iife',
    globalName: '__omsFilm',
    platform: 'browser',
    target: 'chrome130',
    jsx: 'automatic',
    external: PROVIDED,
    loader: ASSET_LOADERS,
    publicPath: 'build',
    sourcemap: 'inline',
    logLevel: 'silent',
    plugins: [studioThree, ...plugins],
  };
}

/** A CLI invocation builds in its own directory so an open Studio keeps its current bundle. */
export async function buildFilmOnce(dir: string, output: string): Promise<BuildResult> {
  let built: BuildResult | undefined;
  const failed = (error: unknown): BuildResult => ({ ok: false, version: 1, errors: [error instanceof Error ? error.message : String(error)] });
  try {
    await build(filmOptions(dir, output, [reporter((result) => { built = result; }, dir, output)]));
  } catch (error) {
    // esbuild rejects a failed build after the reporter heard its formatted errors; anything else failed before it.
    return built ?? failed(error);
  }
  return built ?? failed(new Error('The film build reported no result.'));
}

/**
 * Bundles film.tsx and keeps it bundled: every change to a file it imports rebuilds it,
 * and `onBuilt` hears each result. Returns the context, to dispose when the project closes.
 */
export async function watchFilm(dir: string, onBuilt: (result: BuildResult) => void): Promise<BuildContext> {
  log('film.build-start', { projectPath: dir });
  try {
    const ctx = await context(filmOptions(dir, buildDir(dir), [reporter(onBuilt, dir)]));
    await ctx.watch();
    return ctx;
  } catch (error) {
    logFailure('film.bundler-failed', error, { projectPath: dir });
    throw error;
  }
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Where generated `line` and `column` (1-based, as a stack gives them) came from, by a source map's mappings. */
export function sourceAt(map: { sources: string[]; mappings: string }, line: number, column: number): { source: string; line: number; column: number } | null {
  const lines = map.mappings.split(';');
  // Each field is relative to the one before it, across lines for all but the generated column.
  let source = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  let found: { source: string; line: number; column: number } | null = null;
  for (let l = 0; l < lines.length && l < line; l++) {
    let generated = 0;
    for (const segment of lines[l]!.split(',')) {
      if (!segment) continue;
      const fields: number[] = [];
      let value = 0;
      let shift = 0;
      for (const char of segment) {
        const digit = BASE64.indexOf(char);
        value += (digit & 31) << shift;
        if (digit & 32) shift += 5;
        else {
          fields.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      generated += fields[0] ?? 0;
      if (fields.length < 4) continue;
      source += fields[1]!;
      sourceLine += fields[2]!;
      sourceColumn += fields[3]!;
      if (l === line - 1 && generated <= column - 1) found = { source: map.sources[source] ?? '?', line: sourceLine + 1, column: sourceColumn + 1 };
    }
  }
  return found;
}

/**
 * A page's error as the person can act on it: its first line and where in the project's own sources it was thrown,
 * from the first frame of its stack in the film's bundle (`bundle`, with its inline source map), the rest of the
 * stack left out; a source is named from the project folder `dir`. Without such a frame, its first line alone.
 */
export async function located(text: string, bundle: string, dir: string): Promise<string> {
  const [first, ...stack] = text.split('\n');
  const frame = stack.join('\n').match(/film(?:-\d+)?\.js:(\d+):(\d+)/);
  if (!frame) return text.includes('\n    at ') ? first! : text;
  try {
    const code = await readFile(bundle, 'utf8');
    const inline = /\/\/# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)\s*$/.exec(code);
    if (!inline) return first!;
    const at = sourceAt(JSON.parse(Buffer.from(inline[1]!, 'base64').toString('utf8')), Number(frame[1]), Number(frame[2]));
    if (!at) return first!;
    const source = relative(dir, resolve(dirname(bundle), at.source)).split(sep).join('/');
    return `${first} (at ${source}:${at.line}:${at.column})`;
  } catch {
    return first!;
  }
}
