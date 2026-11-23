// oms's check, still and render: the Studio's own build, review, sound lookup and export, with the film drawn in
// headless Chrome (chrome.ts) and encoded by the person's ffmpeg (ffmpeg.ts). Bundled into dist/worker.cjs beside the
// Studio's preview scripts (resources/preview/).
import { createHash } from 'node:crypto';
import { readdir, rm, stat } from 'node:fs/promises';
import { availableParallelism, freemem, homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import type { FilmReview } from '../desktop/src/shared/api';
import { buildFilmOnce } from '../desktop/src/main/film/film';
import { soundFile } from '../desktop/src/main/film/mix';
import { reviewBuild } from '../desktop/src/main/film/review';
import { exportFrames } from '../desktop/src/main/film/capture';
import { findFfmpeg } from './ffmpeg';
import { findChrome, openChromeStage } from './chrome';
import { removeBuilt, servePlayer, watchProject, writePlayer } from './web';

// Motions come from motionhub when a film asks for one, taken into the project as the Studio and @motionhub/cli take them.
export { searchMotions, useMotion } from '../desktop/src/main/motions';
// Sound effects from the project's motion's sound, for the cues of its picture.
export { effectsTrack, parseCues } from '../desktop/src/main/film/effects';
// Faces from Google Fonts, cut to the project's characters.
export { takeFont } from './font';
/** The SIL Open Font License's text, beside this worker. */
export const OFL = join(__dirname, 'OFL.txt');

const studio = join(__dirname, 'resources', 'preview');

/**
 * Builds the film in `dir` into `scratch`, which also holds each Chrome's own profile; Chrome is found only to open a
 * built film.
 */
async function opener(dir: string, scratch: string) {
  const output = join(scratch, 'build');
  const build = await buildFilmOnce(dir, output);
  let opened = 0;
  return { build, output, open: async () => openChromeStage(await findChrome(), dir, output, studio, join(scratch, `profile-${opened++}`)) };
}

/** How many Chromes draw a render at once: one a core, as memory allows (about 1.5 GB each, as VisoTalk measured), at most 8. */
export const renderStages = (cores = availableParallelism(), free = freemem()): number =>
  Math.max(1, Math.min(cores, Math.floor(free / 1.5e9), 8));

/** The film's review: build errors, its scenes and layers, a draw of its start, each scene's middle and its end, and its sounds. */
export async function check(dir: string, scratch: string): Promise<FilmReview> {
  const { build, output, open } = await opener(dir, scratch);
  const review = await reviewBuild(build, open);
  for (const sound of review.film?.sounds ?? []) {
    try {
      await soundFile(dir, sound.src, output);
    } catch (error) {
      review.issues.push({ id: 'sound-' + sound.src, kind: 'export', severity: 'error', text: String(error) });
    }
  }
  return review;
}

/** Where a render keeps its finished segments until its video is whole, so the same render started again resumes. */
const RENDERS = join(homedir(), '.cache', 'oms', 'renders');
/** Segments of a render not touched for this long are a render nobody came back to, and are removed. */
const KEPT_MS = 7 * 24 * 3600_000;

/**
 * The film as an MP4 at `file`, with its sounds, narration and lines as the Studio exports them (and the lines beside it
 * as SubRip), reporting the share done (0 to 1); stopped, it keeps its finished segments, and the same render started
 * again draws only the rest. Nothing is drawn before ffmpeg is known to have what the render needs.
 */
export async function render(dir: string, scratch: string, file: string, onProgress: (done: number) => void, signal: AbortSignal): Promise<void> {
  const { build, output, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const ffmpeg = await findFfmpeg();
  // Kept by the Chrome that drew them: another one may draw other pixels.
  const resume = join(RENDERS, createHash('sha256').update(await findChrome()).digest('hex').slice(0, 12));
  for (const chrome of await readdir(RENDERS).catch(() => [] as string[]))
    for (const kept of await readdir(join(RENDERS, chrome)).catch(() => [] as string[])) {
      const at = join(RENDERS, chrome, kept);
      if (Date.now() - (await stat(at)).mtimeMs > KEPT_MS) await rm(at, { recursive: true, force: true });
    }
  await exportFrames(dir, build.version, file, onProgress, signal, open, ffmpeg, { output, stages: renderStages(), resume });
}

/** The preview core and the web player's page script, beside this worker. */
const scripts = { core: join(studio, 'core.js'), player: join(__dirname, 'player.js') };

/** The film's size, length, sounds and lines, read by drawing it once. */
async function filmOf(open: () => Promise<{ film: import('../desktop/src/shared/preview').FilmInfo; close(): void | Promise<void> }>) {
  const stage = await open();
  try {
    return stage.film;
  } finally {
    await stage.close();
  }
}

/** The film as a web player in the new folder `out` (web.ts): plays in a browser without a render. */
export async function player(dir: string, scratch: string, out: string): Promise<{ soundtrack: boolean }> {
  const { build, output, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const film = await filmOf(open);
  return writePlayer(dir, output, film, out, { scripts, work: join(scratch, 'mix'), ffmpeg: findFfmpeg, title: basename(resolve(dir)) });
}

/**
 * Plays the film in `dir` at http://127.0.0.1:`port`/ and builds it again whenever a file in the project changes: a
 * page open there comes back at the time it was at. A build that fails is said, and the last good one stays served.
 */
export async function preview(dir: string, scratch: string, port: number, say: (text: string) => void): Promise<() => Promise<void>> {
  let n = 0;
  let served = '';
  const buildOnce = async () => {
    const at = join(scratch, `build-${++n}`);
    const { build, output, open } = await opener(dir, at);
    if (!build.ok) throw new Error(build.errors.join('\n'));
    const out = join(at, 'player');
    await writePlayer(dir, output, await filmOf(open), out, { scripts, work: join(at, 'mix'), ffmpeg: findFfmpeg, title: basename(resolve(dir)), live: true });
    return { at, out };
  };
  const first = await buildOnce();
  served = first.out;
  let last = first.at;
  const { server, built } = servePlayer(() => served, port);
  await new Promise<void>((done, fail) => server.once('listening', done).once('error', fail));
  let busy: Promise<void> = Promise.resolve();
  const stop = watchProject(dir, () => {
    busy = busy.then(async () => {
      try {
        const next = await buildOnce();
        served = next.out;
        await removeBuilt(last);
        last = next.at;
        built();
        say('Built again.');
      } catch (error) {
        say(`The film did not build; still playing the last one that did:\n${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });
  return async () => {
    stop();
    await busy;
    await new Promise((done) => server.close(done));
  };
}

/** The frame at `seconds`, as a PNG. */
export async function still(dir: string, scratch: string, seconds: number): Promise<Buffer> {
  const { build, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const stage = await open();
  try {
    if (!(seconds >= 0 && seconds < stage.film.seconds)) throw new Error(`Time must be in [0, ${stage.film.seconds}) seconds.`);
    return await stage.png(seconds);
  } finally {
    await stage.close();
  }
}
