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
import { copyFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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

/** An esbuild plugin that numbers each build and reports its errors to `onBuilt`. */
export function reporter(onBuilt: (result: BuildResult) => void, dir?: string): Plugin {
  let version = 0;
  return {
    name: 'report',
    setup(build) {
      build.onEnd(async (result) => {
        const errors = await formatted(result.errors);
        version++;
        if (!errors.length && dir) {
          await copyFile(join(buildDir(dir), 'film.js'), join(buildDir(dir), `film-${version}.js`));
          // The motions' faces, which the preview page loads before the film; a face that is not one is said, not loaded.
          const faces = await motionFaces(dir);
          for (const reason of faces.skipped) console.warn(`A motion's face was left out: ${reason}`);
          await writeFile(join(buildDir(dir), FACES), faces.css);
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
  try {
    await build(filmOptions(dir, output));
    await copyFile(join(output, 'film.js'), join(output, 'film-1.js'));
    await writeFile(join(output, FACES), (await motionFaces(dir)).css);
    return { ok: true, version: 1, errors: [] };
  } catch (error) {
    return { ok: false, version: 1, errors: [error instanceof Error ? error.message : String(error)] };
  }
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
