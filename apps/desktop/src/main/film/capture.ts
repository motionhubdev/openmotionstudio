// Stills and export: the film's page opened with ?render=1 in headless
// Chrome (chrome.ts, ADR 0021), moved to each frame's time and photographed. Export pipes the frames
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
import { MIX_FORMAT, mixFinish, mixSounds, soundInputs } from './mix';
import { spokenSound } from '../../shared/sound';
import { availableParallelism, freemem } from 'node:os';

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

/** Frames in a segment of an export: 100 s at 30 fps, so an export that resumes draws at most that much again. */
export const SEGMENT_FRAMES = 3000;

/** How an export is drawn and kept while it is made. */
export interface ExportOptions {
  /** The folder of the film's bundle, which its imported sounds sit beside. */
  output?: string;
  /** How many stages draw at once: stage c the frames c, c + stages, c + 2 stages… of each segment. */
  stages?: number;
  /**
   * A folder that keeps this export's finished segments until the video is whole, under a name made of everything
   * that makes their pixels (the build's files, the film's size and rate, the encoder's settings): an export of the
   * same build started again after an interruption draws only the segments that are missing. Without it the segments
   * are kept beside the file and removed however the export ends.
   */
  resume?: string;
  /** Frames a segment, SEGMENT_FRAMES unless a test asks for fewer. */
  segmentFrames?: number;
}

/** What a segment's pixels depend on: the build's files, the film's size, rate and length, and the encoder. */
async function segmentsName(output: string, version: number, film: { width: number; height: number; fps: number }, frames: number): Promise<string> {
  const hash = createHash('sha256').update(JSON.stringify([VIDEO, film.width, film.height, film.fps, frames]));
  // film-<n>.js are the builds a watch kept: only this export's counts, under one name.
  const files = (await readdir(output, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && (!/^film-\d+\.js$/.test(entry.name) || entry.name === `film-${version}.js`))
    .map((entry) => entry.name)
    .sort();
  for (const name of files) hash.update(`${name === `film-${version}.js` ? 'film-n.js' : name}\0`).update(await readFile(join(output, name)));
  return hash.digest('hex').slice(0, 16);
}

/** Runs ffmpeg to its end; rejects with the last of what it said. */
const run = (ffmpeg: string, args: string[]) =>
  new Promise<void>((done, fail) => {
    const child = spawn(ffmpeg, ['-y', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let said = '';
    child.stderr.on('data', (data) => (said = (said + data).slice(-4000)));
    child.on('error', fail);
    child.on('close', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}: ${said.trim().split('\n').slice(-3).join(' / ')}`))));
  });

/**
 * Renders build `version` of the film in `dir` to `file` as an MP4 with the `ffmpeg` at that path, its sounds mixed in
 * and its lines as a soft subtitle track unless it draws them as captions, reporting the share done (0 to 1); the lines are written beside it as SubRip
 * too (subtitlesFile). Each is written beside its place and moved there only when the video is whole, so a failed or
 * cancelled export leaves whatever was there untouched.
 *
 * The picture is encoded in segments of SEGMENT_FRAMES frames, each moved into place once it is whole and starting on
 * a key frame of its own, then joined as they are; the sound is mixed once for the whole film (mix.ts) and added with
 * the subtitles, the picture copied. With several `stages`, each segment's frames are drawn at once and written to its
 * encoder in turn, a stage holding at most the one frame it waits to write: a frame is a function of its time alone,
 * so the video is the same however many draw it.
 */
/**
 * How many stages draw an export at once: one a core, as memory allows (about 1.5 GB each, a browser drawing the
 * film), at most eight. The Studio's export and `oms render` both draw with this many.
 */
export const renderStages = (cores = availableParallelism(), free = freemem()): number =>
  Math.max(1, Math.min(cores, Math.floor(free / 1.5e9), 8));

export async function exportFrames(
  dir: string,
  version: number,
  file: string,
  onProgress: (done: number) => void,
  signal: AbortSignal,
  open: (version: number) => Promise<PhotoStage>,
  ffmpeg: string,
  { output = buildDir(dir), stages = 1, resume, segmentFrames = SEGMENT_FRAMES }: ExportOptions = {},
): Promise<void> {
  const stage = await open(version);
  const others: PhotoStage[] = [];
  const partial = `${file}.partial.mp4`;
  const partialSubtitles = `${file}.partial.srt`;
  const { film } = stage;
  const frames = Math.round(film.seconds * film.fps);
  const work = resume ? join(resume, await segmentsName(output, version, film, frames)) : `${file}.partial-segments`;
  let whole = false;
  try {
    await mkdir(work, { recursive: true });
    const plan: [number, number][] = [];
    for (let s = 0; s < frames; s += segmentFrames) plan.push([s, Math.min(frames, s + segmentFrames)]);
    const segment = ([s, e]: [number, number]) => join(work, `${String(s).padStart(7, '0')}-${String(e).padStart(7, '0')}.mp4`);
    const kept = new Set(await readdir(work));
    let done = 0;
    for (const [s, e] of plan) {
      if (signal.aborted) throw new Error('The export was cancelled.');
      const name = segment([s, e]);
      if (!kept.has(name.slice(work.length + 1))) {
        // Every stage, opened for the first segment drawn; one that fails to open fails the export.
        const wanted = Math.min(stages, e - s) - 1 - others.length;
        if (wanted > 0) {
          const opening = await Promise.allSettled(Array.from({ length: wanted }, () => open(version)));
          for (const opened of opening) if (opened.status === 'fulfilled') others.push(opened.value);
          const refused = opening.find((opened) => opened.status === 'rejected');
          if (refused) throw refused.reason;
        }
        await drawSegment([stage, ...others].slice(0, Math.max(1, Math.min(stages, e - s))), film, s, e, `${name}.partial.mp4`, ffmpeg, signal, (n) =>
          onProgress((done + n) / frames),
        );
        await rename(`${name}.partial.mp4`, name);
      }
      done += e - s;
      onProgress(done / frames);
    }
    // The segments as they are, one after another; one segment is the picture itself.
    let picture = segment(plan[0]!);
    if (plan.length > 1) {
      const list = join(work, 'segments.txt');
      await writeFile(list, plan.map((range) => `file '${segment(range).slice(work.length + 1)}'\n`).join(''));
      picture = join(work, 'picture.mp4');
      await run(ffmpeg, ['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', picture]);
    }
    const seconds = frames / film.fps;
    const sounds = await soundInputs(dir, ffmpeg, [...film.sounds, ...film.narration.map(spokenSound)], output);
    const mix = await mixSounds(sounds, seconds, ffmpeg, work, film.narration);
    const subtitles = srt(film);
    if (subtitles) await writeFile(partialSubtitles, subtitles);
    // A film that draws its lines as captions (<Film captions>) has them in its picture: a subtitle track as well would
    // show them twice where a player turns it on. Its SubRip file is still written beside it.
    const track = subtitles && !film.captions;
    const subtitleInput = 1 + (mix ? 1 : 0);
    await run(ffmpeg, [
      '-i',
      picture,
      ...(mix ? [...MIX_FORMAT, '-i', mix] : []),
      ...(track ? ['-i', partialSubtitles] : []),
      '-map',
      '0:v',
      '-c:v',
      'copy',
      ...(mix ? ['-filter_complex', `[1:a]${mixFinish(seconds)}[aout]`, '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'] : []),
      ...(track ? ['-map', `${subtitleInput}:s`, '-c:s', 'mov_text', '-metadata:s:s:0', 'language=und'] : []),
      '-movflags',
      '+faststart',
      partial,
    ]);
    await rename(partial, file);
    if (subtitles) await rename(partialSubtitles, subtitlesFile(file));
    whole = true;
  } finally {
    await Promise.allSettled([stage, ...others].map((photographer) => photographer.close()));
    await rm(partial, { force: true });
    await rm(partialSubtitles, { force: true });
    // Kept to resume only while the video is not whole; the mix and the joined picture are made again each time.
    if (resume && !whole) {
      for (const name of await readdir(work).catch(() => [] as string[])) if (!/^\d{7}-\d{7}\.mp4$/.test(name)) await rm(join(work, name), { force: true });
    } else await rm(work, { recursive: true, force: true });
  }
}

/**
 * Draws frames [s, e) of the film with `stages` into an H.264 file at `file`: stage c draws frames s + c, s + c + n…,
 * and frame i goes to the encoder when frame i - 1 has. The first failure, or a cancel, stops every stage.
 */
async function drawSegment(
  drawing: PhotoStage[],
  film: { fps: number },
  s: number,
  e: number,
  file: string,
  ffmpeg: string,
  signal: AbortSignal,
  onDrawn: (frames: number) => void,
): Promise<void> {
  const encoder = spawn(
    ffmpeg,
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(film.fps), '-c:v', 'png', '-i', '-', ...VIDEO, '-g', String(film.fps * 2), '-r', String(film.fps), '-frames:v', String(e - s), file],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );
  let stderr = '';
  encoder.stderr.on('data', (data) => {
    stderr = (stderr + data).slice(-4000);
  });
  encoder.stdin.on('error', () => {});
  const finished = new Promise<void>((done, fail) => {
    encoder.on('error', fail);
    encoder.on('close', (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}: ${stderr.trim().split('\n').slice(-3).join(' / ')}`))));
  });
  finished.catch(() => {});
  try {
    let next = s;
    let broken: unknown = null;
    const waiting = new Map<number, { go: () => void; stop: (error: unknown) => void }>();
    const turn = (i: number) =>
      broken ? Promise.reject(broken) : i === next ? Promise.resolve() : new Promise<void>((go, stop) => waiting.set(i, { go, stop }));
    const draw = async (photographer: PhotoStage, first: number) => {
      for (let i = first; i < e; i += drawing.length) {
        if (broken) throw broken;
        if (signal.aborted) throw new Error('The export was cancelled.');
        const png = await photographer.png(i / film.fps);
        await turn(i);
        if (broken) throw broken;
        await write(encoder.stdin, png);
        onDrawn(i + 1 - s);
        next = i + 1;
        waiting.get(next)?.go();
        waiting.delete(next);
      }
    };
    const drawn = await Promise.allSettled(
      drawing.map((photographer, c) =>
        draw(photographer, s + c).catch((error) => {
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
    await rm(file, { force: true });
    throw error;
  }
  await finished;
}
