// oms's check and still: the Studio's own build, review and sound lookup, with the film drawn in headless Chrome
// (chrome.ts). Bundled into dist/worker.cjs beside the Studio's preview scripts (resources/preview/).
import { join } from 'node:path';
import type { FilmReview } from '../desktop/src/shared/api';
import { buildFilmOnce } from '../desktop/src/main/film/film';
import { soundFile } from '../desktop/src/main/film/mix';
import { reviewBuild } from '../desktop/src/main/film/review';
import { findChrome, openChromeStage } from './chrome';

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

/** The frame at `seconds`, as a PNG. */
export async function still(dir: string, scratch: string, seconds: number): Promise<Buffer> {
  const { build, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const stage = await open();
  try {
    if (!(seconds >= 0 && seconds < stage.film.seconds)) throw new Error(`Time must be in [0, ${stage.film.seconds}) seconds.`);
    return await stage.frame(seconds);
  } finally {
    await stage.close();
  }
}
