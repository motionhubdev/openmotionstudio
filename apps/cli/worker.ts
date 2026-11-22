// oms's check, still and render: the Studio's own build, review, sound lookup and export, with the film drawn in
// headless Chrome (chrome.ts) and encoded by the person's ffmpeg (ffmpeg.ts). Bundled into dist/worker.cjs beside the
// Studio's preview scripts (resources/preview/).
import { join } from 'node:path';
import type { FilmReview } from '../desktop/src/shared/api';
import { buildFilmOnce } from '../desktop/src/main/film/film';
import { soundFile } from '../desktop/src/main/film/mix';
import { reviewBuild } from '../desktop/src/main/film/review';
import { exportFrames } from '../desktop/src/main/film/capture';
import { findFfmpeg } from './ffmpeg';
import { findChrome, openChromeStage } from './chrome';

// Motions come from motionhub when a film asks for one, taken into the project as the Studio and @motionhub/cli take them.
export { searchMotions, useMotion } from '../desktop/src/main/motions';

const studio = join(__dirname, 'resources', 'preview');

/** Builds the film in `dir` into `scratch`, which also holds Chrome's profile; Chrome is found only to open a built film. */
async function opener(dir: string, scratch: string) {
  const output = join(scratch, 'build');
  const build = await buildFilmOnce(dir, output);
  return { build, output, open: async () => openChromeStage(await findChrome(), dir, output, studio, join(scratch, 'profile')) };
}

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

/**
 * The film as an MP4 at `file`, with its sounds, narration and lines as the Studio exports them (and the lines beside it
 * as SubRip), reporting the share done (0 to 1). Nothing is drawn before ffmpeg is known to have what the render needs.
 */
export async function render(dir: string, scratch: string, file: string, onProgress: (done: number) => void): Promise<void> {
  const { build, output, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const ffmpeg = await findFfmpeg();
  await exportFrames(dir, build.version, file, onProgress, new AbortController().signal, open, ffmpeg, output);
}

/** The frame at `seconds`, as a PNG. */
export async function still(dir: string, scratch: string, seconds: number): Promise<Buffer> {
  const { build, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const stage = await open();
  try {
    if (!(seconds >= 0 && seconds < stage.film.seconds)) throw new Error(`Time must be in [0, ${stage.film.seconds}) seconds.`);
    return (await stage.frame(seconds)).toPNG();
  } finally {
    await stage.close();
  }
}
