// Stills and export: the film's page opened with ?render=1 in an
// offscreen window, moved to each frame's time and photographed. Export pipes the frames
// to ffmpeg as H.264 (High, level 4.1, BT.709, a key frame every two seconds, the index
// ahead of the frames), which any phone plays, with the film's sounds mixed beside them
// as AAC (mix.ts). Nothing in the film runs on a clock, so a time always draws the same frame.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PhotoStage, Stage } from './stage';
export type { Stage } from './stage';
import type { SceneStills } from '../../shared/api';
import { COVER, STATE_DIR } from '../project';
import { buildDir } from './film';
import { srt } from './captions';
import { soundInputs, soundMix } from './mix';
import { spokenSound } from '../../shared/sound';

const VIDEO = [
  '-vf',
  'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
  '-colorspace',
  'bt709',
  '-color_primaries',
  'bt709',
  '-color_trc',
  'bt709',
  '-color_range',
  'tv',
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '20',
  '-profile:v',
  'high',
  '-level:v',
  '4.1',
];

/** How many frames each scene is shown by on the timeline, evenly through it. */
export const SCENE_STILLS = 6;
/** The width the timeline's frames are kept at, in pixels; small, since they are drawn small. */
const STILL_WIDTH = 160;

/**
 * The long side a project's cover is kept at, landscape or portrait: sharp on Home's largest card (560 px wide) on a
 * screen of twice the density.
 */
export const COVER_SIDE = 1280;
/** How far into the first scene the cover is taken: after an entrance has settled, before an exit. */
const COVER_AT = 0.6;

/** Takes the project's cover from the first scene and keeps it as `.motion-studio/cover.jpg`, written whole. */
async function takeCover(dir: string, stage: Stage): Promise<void> {
  const first = stage.film.scenes[0];
  if (!first) return;
  const image = await stage.frame(first.start + COVER_AT * first.duration);
  const { width, height } = image.getSize();
  const file = join(dir, STATE_DIR, COVER);
  await writeFile(`${file}.partial`, image.resize(width >= height ? { width: COVER_SIDE } : { height: COVER_SIDE }).toJPEG(85));
  await rename(`${file}.partial`, file);
}

/** A JPEG's size from its frame header, or null for bytes that are not a JPEG whose size can be read. */
export function jpegSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let at = 2; at + 9 < bytes.length; ) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1]!;
    // A start of frame (SOF0 to SOF15, not DHT, JPG or DAC) holds the height and then the width.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  return null;
}

/** Whether a project has a cover as sharp as the Studio takes them; one taken smaller, before, is taken again. */
async function covered(dir: string): Promise<boolean> {
  const bytes = await readFile(join(dir, STATE_DIR, COVER)).catch(() => null);
  if (!bytes) return false;
  const size = jpegSize(bytes);
  return !size || Math.max(size.width, size.height) >= COVER_SIDE;
}

/** Where a project keeps the timeline's frames: one file for the build they are of, named by that build's hash. */
export const stillsDir = (dir: string): string => join(dir, STATE_DIR, 'thumbs');

/**
 * Each scene of build `version` as SCENE_STILLS small frames, by scene id, as data URLs. They are kept in
 * `.motion-studio/thumbs/<hash of the build>.json`, so the same film is photographed once; making them for a new
 * build removes the files of the others there, and nothing outside that folder is written or removed but the
 * project's cover, taken with them (and taken alone when the frames are kept but the cover is not, or is smaller).
 */
export async function sceneStills(dir: string, version: number, open: (version: number) => Promise<Stage>): Promise<SceneStills> {
  const hash = createHash('sha256')
    .update(await readFile(join(buildDir(dir), `film-${version}.js`)))
    .digest('hex')
    .slice(0, 16);
  const folder = stillsDir(dir);
  const file = join(folder, `${hash}.json`);
  let kept: SceneStills | null = null;
  try {
    kept = JSON.parse(await readFile(file, 'utf8')) as SceneStills;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  if (kept) {
    if (!(await covered(dir))) {
      const stage = await open(version);
      try {
        await takeCover(dir, stage);
      } finally {
        stage.close();
      }
    }
    return kept;
  }
  const stage = await open(version);
  const stills: SceneStills = {};
  try {
    for (const scene of stage.film.scenes) {
      stills[scene.id] = [];
      for (let i = 0; i < SCENE_STILLS; i++) {
        const image = await stage.frame(scene.start + ((i + 0.5) / SCENE_STILLS) * scene.duration);
        stills[scene.id]!.push(`data:image/jpeg;base64,${image.resize({ width: STILL_WIDTH }).toJPEG(70).toString('base64')}`);
      }
    }
    await mkdir(folder, { recursive: true });
    await takeCover(dir, stage);
  } finally {
    stage.close();
  }
  // Written whole, then moved into place: a file there is always a whole one.
  await writeFile(`${file}.partial`, JSON.stringify(stills));
  await rename(`${file}.partial`, file);
  for (const name of await readdir(folder)) if (name !== `${hash}.json`) await rm(join(folder, name), { force: true });
  return stills;
}

/** Writes one chunk to a stream, waiting when its buffer is full. */
const write = (stream: NodeJS.WritableStream, chunk: Buffer) =>
  new Promise<void>((done, fail) => {
    stream.write(chunk, (error) => (error ? fail(error) : done()));
  });

/** Where an export's subtitles are written: beside the video, under its name. */
export const subtitlesFile = (file: string): string => `${file.replace(/\.mp4$/i, '')}.srt`;

/**
 * Renders build `version` of the film in `dir` to `file` as an MP4 with the `ffmpeg` at that path, its sounds mixed in
 * and its lines as a soft subtitle track, reporting the share done (0 to 1); the lines are written beside it as SubRip
 * too (subtitlesFile). The film's bundle, which its imported sounds sit beside, is in `output`. Each is written beside
 * its place and moved there only when the video is whole, so a failed or cancelled export leaves whatever was there
 * untouched.
 *
 * With `stages` above one, that many stages draw at once, stage c the frames c, c + stages, c + 2 stages…, each
 * written to the encoder in its turn; a stage holds at most the one frame it waits to write. A frame is a function of
 * its time alone, so the video is the same however many draw it.
 */
export async function exportFrames(
  dir: string,
  version: number,
  file: string,
  onProgress: (done: number) => void,
  signal: AbortSignal,
  open: (version: number) => Promise<PhotoStage>,
  ffmpeg: string,
  output = buildDir(dir),
  stages = 1,
): Promise<void> {
  const stage = await open(version);
  const others: PhotoStage[] = [];
  const partial = `${file}.partial.mp4`;
  const partialSubtitles = `${file}.partial.srt`;
  try {
    const { film } = stage;
    const frames = Math.round(film.seconds * film.fps);
    // The sounds come after the picture's input (0), then the subtitles; a film with neither is picture only.
    const mix = soundMix(await soundInputs(dir, ffmpeg, [...film.sounds, ...film.narration.map(spokenSound)], output), frames / film.fps, 1, film.narration);
    const subtitles = srt(film);
    if (subtitles) await writeFile(partialSubtitles, subtitles);
    const subtitleInput = 1 + (mix ? mix.inputs.length / 2 : 0);
    const streams = [
      ...(mix ? [...mix.inputs, '-filter_complex', mix.graph] : []),
      ...(subtitles ? ['-i', partialSubtitles] : []),
      ...(mix || subtitles ? ['-map', '0:v'] : []),
      ...(mix ? ['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'] : []),
      ...(subtitles ? ['-map', `${subtitleInput}:s`, '-c:s', 'mov_text', '-metadata:s:s:0', 'language=und'] : []),
    ];
    const encoder = spawn(
      ffmpeg,
      [
        '-y',
        '-loglevel',
        'error',
        '-f',
        'image2pipe',
        '-framerate',
        String(film.fps),
        '-c:v',
        'png',
        '-i',
        '-',
        ...streams,
        ...VIDEO,
        '-g',
        String(film.fps * 2),
        '-r',
        String(film.fps),
        '-frames:v',
        String(frames),
        '-movflags',
        '+faststart',
        partial,
      ],
      { stdio: ['pipe', 'ignore', 'pipe'] },
    );
    let stderr = '';
    encoder.stderr.on('data', (data) => {
      stderr = (stderr + data).slice(-4000);
    });
    encoder.stdin.on('error', () => {});
    const finished = new Promise<void>((done, fail) => {
      encoder.on('error', fail);
      encoder.on('close', (code) =>
        code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}: ${stderr.trim().split('\n').slice(-3).join(' / ')}`)),
      );
    });
    finished.catch(() => {});
    try {
      // Every stage, opened before a frame is drawn; one that fails to open fails the export.
      const opening = await Promise.allSettled(Array.from({ length: Math.min(stages, frames) - 1 }, () => open(version)));
      for (const opened of opening) if (opened.status === 'fulfilled') others.push(opened.value);
      const refused = opening.find((opened) => opened.status === 'rejected');
      if (refused) throw refused.reason;
      const drawing = [stage, ...others];
      // Frame i goes to the encoder when frame i - 1 has: a stage that drew ahead waits for its turn.
      let next = 0;
      let broken: unknown = null;
      const waiting = new Map<number, { go: () => void; stop: (error: unknown) => void }>();
      const turn = (i: number) =>
        broken ? Promise.reject(broken) : i === next ? Promise.resolve() : new Promise<void>((go, stop) => waiting.set(i, { go, stop }));
      const draw = async (photographer: PhotoStage, first: number) => {
        for (let i = first; i < frames; i += drawing.length) {
          if (broken) throw broken;
          if (signal.aborted) throw new Error('The export was cancelled.');
          const png = await photographer.png(i / film.fps);
          await turn(i);
          if (broken) throw broken;
          await write(encoder.stdin, png);
          onProgress((i + 1) / frames);
          next = i + 1;
          waiting.get(next)?.go();
          waiting.delete(next);
        }
      };
      const drawn = await Promise.allSettled(
        drawing.map((photographer, c) =>
          draw(photographer, c).catch((error) => {
            // The first failure stops every stage: those waiting for a turn, and those drawing, at their next frame.
            if (!broken) broken = error;
            for (const waiter of waiting.values()) waiter.stop(broken);
            waiting.clear();
            throw error;
          }),
        ),
      );
      if (broken || drawn.some((result) => result.status === 'rejected')) throw broken;
      encoder.stdin.end();
    } catch (error) {
      encoder.kill('SIGKILL');
      await finished.catch(() => {});
      throw error;
    }
    await finished;
    await rename(partial, file);
    if (subtitles) await rename(partialSubtitles, subtitlesFile(file));
  } finally {
    await Promise.allSettled([stage, ...others].map((photographer) => photographer.close()));
    await rm(partial, { force: true });
    await rm(partialSubtitles, { force: true });
  }
}
