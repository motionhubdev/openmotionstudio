// A film's sounds mixed for its MP4 (ADR 0010): each <Sound>'s file found in the project, its length read by ffmpeg,
// decoded once to raw samples, and summed here in blocks, each sound cut, looped, levelled, faded, placed and ducked by
// the same curves the preview plays (shared/sound.ts). The exporter (capture.ts) then has ffmpeg hold the sum under
// -1 dBFS and make it as long as the film (mixFinish). Mixing in an ffmpeg filter graph padded every sound to the
// whole film; VisoTalk measured fifteen minutes for a five-minute film with 150 sounds that way.

import { execFile } from 'node:child_process';
import { closeSync, fstatSync, openSync, readSync, writeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STATE_DIR } from '../project';
import { type FilmSound, decibels, ducked, soundFades, soundPlace, soundRegion, soundSpan } from '../../shared/sound';
import { buildDir } from './film';
import { safePreviewFile } from './serve';

/** The rate every sound is mixed at. */
const RATE = 48000;
/** -1 dBFS, the most the mix may reach. */
const CEILING = 0.891;

/** A sound's file on disk: in the film's bundle or in the project, never outside it, in Git's or the Studio's folders. */
export async function soundFile(dir: string, src: string, output = buildDir(dir)): Promise<string> {
  const place = soundPlace(src);
  const file = place && (await safePreviewFile(place.root === 'build' ? output : dir, place.path, place.root === 'project').catch(() => null));
  if (!file) throw new Error(`<Sound src="${src}">: no such file in the project. A sound's src is a path in the project, as media/music.mp3.`);
  return file;
}

/** A media file's length in seconds, as ffmpeg reads it. */
export function mediaSeconds(ffmpeg: string, file: string): Promise<number> {
  return new Promise((done, fail) =>
    // ffmpeg with an input and no output says what the input is, and exits 1.
    execFile(ffmpeg, ['-hide_banner', '-i', file], { timeout: 30_000, windowsHide: true }, (_error, _stdout, stderr) => {
      const match = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(String(stderr));
      if (!match) return fail(new Error(`${file} is no sound ffmpeg can read.`));
      done(Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]));
    }),
  );
}

const n = (value: number) => Number(value.toFixed(6)).toString();

/** A mix's raw samples as ffmpeg reads and writes them: 32-bit float, stereo, interleaved, at RATE. */
export const MIX_FORMAT = ['-f', 'f32le', '-ar', String(RATE), '-ac', '2'];

/** What every mix ends with, as an ffmpeg filter on its summed track: held under -1 dBFS, exactly `seconds` long. */
export const mixFinish = (seconds: number): string =>
  `alimiter=limit=${CEILING}:level=false:latency=true,apad,atrim=end=${n(seconds)},asetpts=PTS-STARTPTS`;

const run = (ffmpeg: string, args: string[]) =>
  new Promise<void>((done, fail) =>
    execFile(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { timeout: 600_000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (error, _out, stderr) =>
      error ? fail(new Error(`ffmpeg could not decode a sound: ${String(stderr).trim().split('\n').slice(-2).join(' / ') || error.message}`)) : done(),
    ),
  );

/** Seconds of the film mixed at a time: a sound is read only where it plays, and never whole into memory. */
const BLOCK_SECONDS = 30;

/**
 * Mixes `sounds` (each with its file and that file's length) into `work`/mix.f32 as MIX_FORMAT samples, `seconds`
 * long, and gives its path; null when nothing is heard. Each file is decoded once, as the graph mix converted it
 * (resampled to RATE, then to stereo as ffmpeg makes it). A sound plays from `at` for its span: its region from
 * `trim`, again and again when it loops; it is levelled and faded by `soundGain`'s curve and, with `duck`, down by it
 * while a line of `narration` is said, by `ducked`'s curve, sample by sample. The sum is not normalised or limited
 * here (mixFinish does that).
 */
export async function mixSounds(
  sounds: { sound: FilmSound; file: string; fileSeconds: number }[],
  seconds: number,
  ffmpeg: string,
  work: string,
  narration: { at: number; until: number }[] = [],
): Promise<string | null> {
  const heard = sounds.filter(({ sound, fileSeconds }) => soundSpan(sound, fileSeconds) > 0 && sound.at < seconds);
  if (!heard.length) return null;
  const decoded = new Map<string, string>();
  for (const { file } of heard) {
    if (decoded.has(file)) continue;
    const raw = join(work, `sound-${decoded.size}.f32`);
    await run(ffmpeg, ['-y', '-i', file, '-af', `aresample=${RATE},aformat=sample_fmts=fltp:channel_layouts=stereo`, ...MIX_FORMAT, raw]);
    decoded.set(file, raw);
  }
  const total = Math.round(seconds * RATE);
  const out = join(work, 'mix.f32');
  const handles: number[] = [];
  try {
    const opened = new Map([...decoded].map(([file, raw]) => {
      const fd = openSync(raw, 'r');
      handles.push(fd);
      return [file, { fd, frames: Math.floor(fstatSync(fd).size / 8) }];
    }));
    const placed = heard.map(({ sound, file, fileSeconds }) => {
      const span = soundSpan(sound, fileSeconds);
      const { fadeIn, fadeOut } = soundFades(sound, span);
      const source = opened.get(file)!;
      const trim = Math.round(sound.trim * RATE);
      const region = Math.max(1, Math.min(Math.round(soundRegion(sound, fileSeconds) * RATE), source.frames - trim));
      const at = Math.round(sound.at * RATE);
      return { sound, span, fadeIn, fadeOut, level: decibels(sound.volume), ...source, trim, region, at, end: Math.min(total, at + Math.round(span * RATE)) };
    });
    const target = openSync(out, 'w');
    handles.push(target);
    const block = BLOCK_SECONDS * RATE;
    for (let start = 0; start < total; start += block) {
      const count = Math.min(block, total - start);
      const mix = new Float32Array(count * 2);
      for (const p of placed) {
        const from = Math.max(start, p.at);
        const to = Math.min(start + count, p.end);
        if (to <= from || p.frames <= p.trim) continue;
        // The sound's own samples for [from, to): its region from trim, wrapped round when it loops.
        const samples = new Float32Array((to - from) * 2);
        const bytes = new Uint8Array(samples.buffer);
        for (let i = from; i < to; ) {
          const k = i - p.at;
          const offset = p.sound.loop ? k % p.region : k;
          if (offset >= p.region) break; // past its region, once: silence
          const frames = Math.min(to - i, p.region - offset);
          readSync(p.fd, bytes, (i - from) * 8, frames * 8, (p.trim + offset) * 8);
          i += frames;
        }
        const duck = p.sound.duck && narration.length ? 1 - decibels(-p.sound.duck) : 0;
        for (let i = from; i < to; i++) {
          const u = (i - p.at) / RATE;
          const rise = p.fadeIn > 0 ? Math.min(1, u / p.fadeIn) : 1;
          const fall = p.fadeOut > 0 ? Math.min(1, (p.span - u) / p.fadeOut) : 1;
          let gain = p.level * Math.max(0, Math.min(rise, fall));
          if (duck) gain *= 1 - duck * ducked(narration, i / RATE);
          const j = 2 * (i - from);
          const d = 2 * (i - start);
          mix[d] = mix[d]! + samples[j]! * gain;
          mix[d + 1] = mix[d + 1]! + samples[j + 1]! * gain;
        }
      }
      writeSync(target, new Uint8Array(mix.buffer));
    }
  } finally {
    for (const fd of handles) closeSync(fd);
  }
  return out;
}

/** How many peaks a second a waveform keeps. */
export const PEAKS_PER_SECOND = 50;
/** The rate a file is decoded at for its waveform: enough to find its peaks, little to read. */
const PEAK_RATE = 8000;

/** The loudest sample of each 1/PEAKS_PER_SECOND s of mono samples, from 0 to 1. */
export function peaksOf(samples: Float32Array, rate: number): number[] {
  const size = Math.max(1, Math.round(rate / PEAKS_PER_SECOND));
  const peaks: number[] = [];
  for (let start = 0; start < samples.length; start += size) {
    let peak = 0;
    for (let i = start; i < Math.min(samples.length, start + size); i++) peak = Math.max(peak, Math.abs(samples[i]!));
    peaks.push(Math.min(1, Number(peak.toFixed(3))));
  }
  return peaks;
}

/**
 * A sound's waveform for the timeline: its length and its peaks (PEAKS_PER_SECOND a second). Read with ffmpeg once for
 * each version of the file and kept in `.motion-studio/peaks/`, named by the file's path, size and time.
 */
export async function soundPeaks(dir: string, ffmpeg: string, src: string): Promise<{ seconds: number; peaks: number[] }> {
  const file = await soundFile(dir, src);
  const { size, mtimeMs } = await stat(file);
  const folder = join(dir, STATE_DIR, 'peaks');
  const kept = join(folder, `${createHash('sha256').update(`${file}\n${size}\n${mtimeMs}`).digest('hex').slice(0, 16)}.json`);
  try {
    return JSON.parse(await readFile(kept, 'utf8')) as { seconds: number; peaks: number[] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const pcm = await new Promise<Buffer>((done, fail) =>
    execFile(
      ffmpeg,
      ['-hide_banner', '-loglevel', 'error', '-i', file, '-t', '1800', '-ac', '1', '-ar', String(PEAK_RATE), '-f', 'f32le', '-'],
      { encoding: 'buffer', maxBuffer: 1800 * PEAK_RATE * 4 + 1024, timeout: 120_000, windowsHide: true },
      (error, stdout, stderr) => (error ? fail(new Error(`${src} could not be read: ${String(stderr).trim().split('\n').pop()}`)) : done(stdout)),
    ),
  );
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  const waveform = { seconds: samples.length / PEAK_RATE, peaks: peaksOf(samples, PEAK_RATE) };
  await mkdir(folder, { recursive: true });
  await writeFile(`${kept}.partial`, JSON.stringify(waveform));
  await rename(`${kept}.partial`, kept);
  return waveform;
}

/** `sounds` with their files and those files' lengths, for soundMix. */
export async function soundInputs(dir: string, ffmpeg: string, sounds: FilmSound[], output = buildDir(dir)) {
  return Promise.all(
    sounds.map(async (sound) => {
      const file = await soundFile(dir, sound.src, output);
      return { sound, file, fileSeconds: await mediaSeconds(ffmpeg, file) };
    }),
  );
}
