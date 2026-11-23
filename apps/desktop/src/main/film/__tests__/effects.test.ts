import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectsTrack, motionSounds, parseCues } from '../effects';

/** A motion's sound as @iamsuosi/night-diagram ships it. */
const SOUND = {
  bpm: 68,
  root: 87,
  kit: ['pad', 'room'],
  bed: 0.3,
  roles: {
    land: { voice: 'noise', lo: 80, hi: 500, len: 0.6 },
    move: { voice: 'swish', lo: 60, hi: 900, rise: 0.5 },
    count: [{ voice: 'noise', lo: 2000, hi: 12000, len: 0.08 }, { voice: 'thump', freq: 45, len: 1.2, drop: 0.3, gain: 0.8 }],
    cut: { voice: 'click', lo: 3000, hi: 12000, len: 0.04 },
  },
};

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-effects-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const motion = async (id: string, sound: unknown = SOUND) => {
  await mkdir(join(dir, 'motions', id, 'react'), { recursive: true });
  await writeFile(join(dir, 'motions', id, 'react', 'sound.json'), JSON.stringify(sound));
};

/** The samples of a 16-bit mono WAV, as -1 to 1. */
const samples = (wav: Buffer) => Array.from({ length: (wav.length - 44) / 2 }, (_, i) => wav.readInt16LE(44 + i * 2) / 32767);
const loudest = (values: number[]) => values.reduce((peak, v) => Math.max(peak, Math.abs(v)), 0);

describe('parseCues', () => {
  it('reads at:role and at:role:dur, in time order, however they are separated', () => {
    expect(parseCues('3.4:move:0.6, 1.2:land  5:count')).toEqual([
      { at: 1.2, role: 'land' },
      { at: 3.4, role: 'move', dur: 0.6 },
      { at: 5, role: 'count' },
    ]);
  });

  it('refuses a cue that is not one, saying how to write it', () => {
    for (const bad of ['1.2:bang', '-1:land', 'x:land', '1:land:0', '1:land:2:3', ':land', ''])
      expect(() => parseCues(bad)).toThrow(/cue/i);
  });
});

describe('the sound effects of a film', () => {
  it("finds the project's motions with a sound, from motionhub and its own", async () => {
    await motion('@iamsuosi/night-diagram');
    await motion('house');
    await mkdir(join(dir, 'motions', '@x', 'silent', 'react'), { recursive: true });
    expect((await motionSounds(dir)).map((m) => m.id)).toEqual(['@iamsuosi/night-diagram', 'house']);
  });

  it("renders the motion's sound for the cues, as long as the film, the same every time", async () => {
    await motion('@iamsuosi/night-diagram');
    const cues = parseCues('0.5:land, 2:count');
    const { motion: used, wav } = await effectsTrack(dir, cues, 3);
    expect(used).toBe('@iamsuosi/night-diagram');
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(24)).toBe(44100);
    expect(wav.length).toBe(44 + 3 * 44100 * 2);
    const pcm = samples(wav);
    expect(loudest(pcm.slice(0.5 * 44100, 0.8 * 44100))).toBeGreaterThan(0.01);
    expect(loudest(pcm)).toBeLessThanOrEqual(1);
    expect((await effectsTrack(dir, cues, 3)).wav.equals(wav)).toBe(true);
  });

  it('refuses a cue whose role the sound does not know, naming the roles it does', async () => {
    await motion('@iamsuosi/night-diagram');
    await expect(effectsTrack(dir, parseCues('1:land, 2:out'), 3)).rejects.toThrow(
      "@iamsuosi/night-diagram's sound has no out: its roles are land, move, count, cut. Use one of them for 2:out.",
    );
  });

  it('says how loud the track is, and each cue, so it can be judged unheard', async () => {
    await motion('@iamsuosi/night-diagram', { roles: SOUND.roles });
    const { report } = await effectsTrack(dir, parseCues('0.5:land, 2:count'), 3);
    expect(report.roles).toEqual(['land', 'move', 'count', 'cut']);
    expect(report.peak).toBeLessThanOrEqual(0);
    expect(report.rms).toBeLessThan(report.peak);
    expect(report.cues.map((cue) => [cue.at, cue.role, cue.silent])).toEqual([[0.5, 'land', false], [2, 'count', false]]);
    expect(report.cues[0]!.peak).toBeGreaterThan(-60);
  });

  it('asks which motion when the project has several, and says why there is none', async () => {
    await expect(effectsTrack(dir, parseCues('1:land'), 2)).rejects.toThrow('No motion in the project has a sound');
    await motion('@a/one');
    await motion('@b/two');
    await expect(effectsTrack(dir, parseCues('1:land'), 2)).rejects.toThrow('Name the motion whose sound to use: @a/one, @b/two');
    await expect(effectsTrack(dir, parseCues('1:land'), 2, '@b/two')).resolves.toMatchObject({ motion: '@b/two' });
    await expect(effectsTrack(dir, parseCues('1:land'), 2, '@c/three')).rejects.toThrow('no motion @c/three');
  });

  it('refuses a cue past the end, a track of no length, and a sound.json with issues', async () => {
    await motion('@iamsuosi/night-diagram');
    await expect(effectsTrack(dir, parseCues('4:land'), 3)).rejects.toThrow('past the track');
    await expect(effectsTrack(dir, parseCues('1:land'), 0)).rejects.toThrow('length in seconds');
    await motion('@iamsuosi/night-diagram', { roles: { land: { voice: 'kazoo' } } });
    await expect(effectsTrack(dir, parseCues('1:land'), 3)).rejects.toThrow("@iamsuosi/night-diagram's sound.json");
  });
});
