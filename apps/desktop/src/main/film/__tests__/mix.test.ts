import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FilmSound } from '../../../shared/sound';
import { soundGain, soundPlace, soundSpan } from '../../../shared/sound';

vi.mock('electron', () => ({ app: { getAppPath: () => '' }, protocol: {} }));

const { MIX_FORMAT, mediaSeconds, mixFinish, mixSounds, soundFile } = await import('../mix');

const ffmpeg = ffmpegStatic!;
const sound = (over: Partial<FilmSound>): FilmSound => ({
  src: 'media/a.mp3', at: 0, dur: null, until: 10, trim: 0, loop: false, volume: 0, fadeIn: 0, fadeOut: 0, ...over,
});

const run = (args: string[]) =>
  new Promise<string>((done, fail) =>
    execFile(ffmpeg, ['-hide_banner', ...args], { timeout: 60_000, windowsHide: true }, (error, _out, stderr) =>
      error ? fail(new Error(String(stderr))) : done(String(stderr)),
    ),
  );

describe('how long a sound plays and how loud', () => {
  it('plays its region once, again and again when looped, never past where it sits', () => {
    expect(soundSpan(sound({}), 3)).toBe(3);
    expect(soundSpan(sound({ trim: 1 }), 3)).toBe(2);
    expect(soundSpan(sound({ dur: 1.5 }), 3)).toBe(1.5);
    expect(soundSpan(sound({ at: 9 }), 3)).toBe(1);
    expect(soundSpan(sound({ loop: true, at: 2, until: 8 }), 3)).toBe(6);
  });

  it('is its volume through its fades, which shrink together when the sound is short', () => {
    const s = sound({ volume: -6, fadeIn: 1, fadeOut: 1 });
    expect(soundGain(s, 4, 0)).toBe(0);
    expect(soundGain(s, 4, 0.5)).toBeCloseTo(10 ** (-6 / 20) / 2);
    expect(soundGain(s, 4, 2)).toBeCloseTo(10 ** (-6 / 20));
    expect(soundGain(s, 4, 4)).toBe(0);
    // 1 s of fades in a 1 s sound: each 0.5 s, so it is fully up only at its middle.
    expect(soundGain(sound({ fadeIn: 1, fadeOut: 1 }), 1, 0.5)).toBeCloseTo(1);
  });

  it('is a file in the project or the film\'s bundle, nothing else', () => {
    expect(soundPlace('media/bed.mp3')).toEqual({ root: 'project', path: 'media/bed.mp3' });
    expect(soundPlace('./media/bed.mp3')).toEqual({ root: 'project', path: 'media/bed.mp3' });
    expect(soundPlace('build/bed-AB12.mp3')).toEqual({ root: 'build', path: 'bed-AB12.mp3' });
    for (const src of ['https://example.com/a.mp3', '/etc/a.mp3', 'C:/a.mp3', '../a.mp3', 'media/../../a.mp3', '']) expect(soundPlace(src)).toBeNull();
  });
});

describe('the export\'s mix', () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'oms-mix-'));
    await mkdir(join(dir, 'media'));
    // A 1.5 s tone near full scale (the sine source is at 1/8 of it), and a quiet 0.5 s one.
    await run(['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1.5', '-af', 'volume=17dB', join(dir, 'media', 'bed.wav')]);
    await run(['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.5', join(dir, 'media', 'hit.wav')]);
    // A second at a level of 0.5, and a second whose value is its time: stereo float WAVs, so neither a mono file's
    // conversion to stereo nor a step of 16 bits changes a level the tests read.
    await run(['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'aevalsrc=0.5|0.5:s=48000:d=1', '-c:a', 'pcm_f32le', join(dir, 'media', 'flat.wav')]);
    await run(['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'aevalsrc=t|t:s=48000:d=1', '-c:a', 'pcm_f32le', join(dir, 'media', 'ramp.wav')]);
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  /** The mix's left channel at film time `t`, from its raw samples. */
  const at = (pcm: Float32Array, t: number) => pcm[2 * Math.round(t * 48000)]!;
  const mixed = async (sounds: Parameters<typeof mixSounds>[0], seconds: number, narration: { at: number; until: number }[] = []) => {
    const work = await mkdtemp(join(dir, 'work-'));
    const raw = await mixSounds(sounds, seconds, ffmpeg, work, narration);
    return raw ? new Float32Array(new Uint8Array(await readFile(raw)).buffer) : null;
  };
  const flat = async () => ({ file: join(dir, 'media', 'flat.wav'), fileSeconds: 1 });
  const ramp = async () => ({ file: join(dir, 'media', 'ramp.wav'), fileSeconds: 1 });

  it('places, levels and cuts each sound in the film, as long as the film, and nothing for a film with none', async () => {
    const pcm = (await mixed([{ sound: sound({ src: 'media/flat.wav', at: 1, dur: 0.5, volume: -6 }), ...(await flat()) }], 3))!;
    expect(pcm.length).toBe(3 * 48000 * 2);
    expect(at(pcm, 0.5)).toBe(0);
    expect(at(pcm, 1.2)).toBeCloseTo(0.5 * 10 ** (-6 / 20), 4);
    expect(pcm[2 * Math.round(1.2 * 48000) + 1]).toBeCloseTo(at(pcm, 1.2), 6); // both channels
    expect(at(pcm, 1.6)).toBe(0);
    expect(await mixed([], 3)).toBeNull();
    expect(await mixed([{ sound: sound({ src: 'media/flat.wav', at: 5 }), ...(await flat()) }], 3)).toBeNull();
  }, 60_000);

  it('plays its region from trim, again and again when it loops, and adds sounds that meet', async () => {
    // The ramp's value is its own time, so each sample says where in the file it came from.
    const pcm = (await mixed([
      { sound: sound({ src: 'media/ramp.wav', at: 2, trim: 0.25, dur: 0.5, loop: true, until: 3.5 }), ...(await ramp()) },
      { sound: sound({ src: 'media/flat.wav', at: 3.4, until: 4 }), ...(await flat()) },
    ], 4))!;
    expect(at(pcm, 2.1)).toBeCloseTo(0.35, 3);
    expect(at(pcm, 2.6)).toBeCloseTo(0.35, 3); // once round its half-second region
    expect(at(pcm, 3.2)).toBeCloseTo(0.45, 3);
    expect(at(pcm, 3.45)).toBeCloseTo(0.7 + 0.5, 3); // 1.45 s in: 0.45 s round its region, from 0.25
    expect(at(pcm, 3.7)).toBeCloseTo(0.5, 4); // the loop stops at its until
  }, 60_000);

  it('fades in and out on straight lines, and ducks under the narration by its duck, and comes back', async () => {
    const faded = (await mixed([{ sound: sound({ src: 'media/flat.wav', loop: true, until: 4, fadeIn: 1, fadeOut: 2 }), ...(await flat()) }], 4))!;
    expect(at(faded, 0.5)).toBeCloseTo(0.25, 3);
    expect(at(faded, 1.5)).toBeCloseTo(0.5, 4);
    expect(at(faded, 3)).toBeCloseTo(0.25, 3);
    const ducked = (await mixed([{ sound: sound({ src: 'media/flat.wav', loop: true, until: 4, duck: 12 }), ...(await flat()) }], 4, [{ at: 1, until: 2 }]))!;
    expect(at(ducked, 0.5)).toBeCloseTo(0.5, 4);
    expect(at(ducked, 1.5)).toBeCloseTo(0.5 * 10 ** (-12 / 20), 4);
    expect(at(ducked, 3)).toBeCloseTo(0.5, 4);
  }, 60_000);

  it('reaches the video as long as the film, under -1 dBFS, through mixFinish', async () => {
    const bed = await soundFile(dir, 'media/bed.wav');
    const hit = await soundFile(dir, './media/hit.wav');
    expect(await mediaSeconds(ffmpeg, bed)).toBeCloseTo(1.5, 1);
    const work = await mkdtemp(join(dir, 'work-'));
    const raw = (await mixSounds(
      [
        { sound: sound({ src: 'media/bed.wav', loop: true, until: 4, volume: 6 }), file: bed, fileSeconds: await mediaSeconds(ffmpeg, bed) },
        { sound: sound({ src: 'media/hit.wav', at: 1, until: 4, volume: 6 }), file: hit, fileSeconds: await mediaSeconds(ffmpeg, hit) },
      ],
      4,
      ffmpeg,
      work,
    ))!;
    const out = join(dir, 'mix.wav');
    await run(['-y', '-loglevel', 'error', ...MIX_FORMAT, '-i', raw, '-af', mixFinish(4), out]);
    expect(await mediaSeconds(ffmpeg, out)).toBeCloseTo(4, 2);
    const stats = await run(['-i', out, '-af', 'astats=measure_overall=Peak_level:measure_perchannel=none', '-f', 'null', '-']);
    const peak = Number(/Peak level dB: (-?[\d.]+)/.exec(stats)?.[1]);
    // Raised 6 dB, the tone would clip; the limiter holds it at -1 dBFS.
    expect(peak).toBeLessThanOrEqual(-0.9);
    expect(peak).toBeGreaterThan(-2);
  }, 60_000);

  it('refuses a sound outside the project, or in its hidden folders', async () => {
    await writeFile(join(dir, 'secret.txt'), 'x');
    for (const src of ['../secret.txt', 'https://example.com/a.mp3', 'media/missing.wav', '.git/config']) {
      await expect(soundFile(dir, src)).rejects.toThrow('no such file in the project');
    }
  });
});
