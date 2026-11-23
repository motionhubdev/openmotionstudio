// A film's sound effects from its motion's sound (react/sound.json, motionhub's SPEC.md), or from oms's own when the
// film draws in no motion: the cues the film's picture makes (something lands, moves, is drawn, counts, cuts, goes),
// rendered by @motionhub/runtime/sound, the same synth that gives a motion's reel its sound on motionhub.dev, into a WAV
// in the project that a <Sound> plays.

import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROLES, renderSound, soundIssues, type Cue, type Role, type Sound } from '@motionhub/runtime/sound';

/** The rate the synth renders at. */
const RATE = 44100;

/**
 * Cues written as `at:role` or `at:role:dur`, separated by commas or spaces (`1.2:land, 3.4:move:0.6`): seconds into
 * the film, one of the roles a motion's sound knows (land, move, draw, count, cut, out), and how long a move or a
 * stroke lasts.
 */
export function parseCues(text: string): Cue[] {
  const cues = text.split(/[\s,]+/).filter(Boolean).map((written) => {
    const [at, role, dur, extra] = written.split(':');
    const cue: Cue = { at: Number(at), role: role as Role };
    if (dur !== undefined) cue.dur = Number(dur);
    if (extra !== undefined || !at || !(cue.at >= 0) || !Number.isFinite(cue.at) || !ROLES.includes(cue.role) || (cue.dur !== undefined && !(cue.dur > 0 && Number.isFinite(cue.dur))))
      throw new Error(`"${written}" is no cue: write at:role or at:role:dur, with at and dur in seconds and role one of ${ROLES.join(', ')}.`);
    return cue;
  });
  if (!cues.length) throw new Error('No cues: write them as at:role, separated by commas, as "1.2:land, 3.4:move:0.6".');
  return cues.sort((a, b) => a.at - b.at);
}

/**
 * The sound a film without a motion plays: every role, no bed, plain enough for any look. A motion's own sound, when
 * the project has one, comes first.
 */
export const DEFAULT_SOUND: Sound = {
  roles: {
    land: [{ voice: 'thump', freq: 70, len: 0.35, drop: 0.5 }, { voice: 'click', lo: 1500, hi: 6000, len: 0.03, gain: 0.5 }],
    move: { voice: 'swish', lo: 300, hi: 3000, rise: 0.5 },
    draw: { voice: 'scratch', lo: 1800, hi: 6000 },
    count: { voice: 'marimba', freq: 784, len: 0.4 },
    cut: { voice: 'click', lo: 2000, hi: 9000, len: 0.03 },
    out: { voice: 'swish', lo: 200, hi: 1500, rise: 0.2 },
  },
};

/** What the report names as the sound's source when no motion gave it. */
export const DEFAULT_SOUND_ID = 'oms';

/** The project's motions with a sound: a motion from motionhub at motions/@scope/slug, the project's own at motions/name. */
export async function motionSounds(dir: string): Promise<{ id: string; file: string }[]> {
  const root = join(dir, 'motions');
  const found: { id: string; file: string }[] = [];
  const names = async (at: string) => (await readdir(at, { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const name of await names(root)) {
    const ids = name.startsWith('@') ? (await names(join(root, name))).map((slug) => `${name}/${slug}`) : [name];
    for (const id of ids) {
      const file = join(root, id, 'react', 'sound.json');
      if (existsSync(file)) found.push({ id, file });
    }
  }
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

/** How loud a stretch of samples is: its peak and its RMS level, in dBFS (-Infinity for silence). */
const levels = (samples: Float32Array) => {
  let peak = 0;
  let sum = 0;
  for (const value of samples) {
    peak = Math.max(peak, Math.abs(value));
    sum += value * value;
  }
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { peak: db(peak), rms: db(Math.sqrt(sum / Math.max(1, samples.length))) };
};

/** Quieter than this, a cue is not heard: the voice its role names made no sound there. */
const SILENT_DB = -60;

/** What a track holds, to read without hearing it: its levels, and each cue's peak. */
export interface EffectsReport {
  motion: string;
  /** The roles the motion's sound knows. */
  roles: string[];
  peak: number;
  rms: number;
  /** Each cue's own peak, in the track without its bed and before the next cue begins. */
  cues: (Cue & { peak: number; silent: boolean })[];
}

/**
 * The sound of motion `id` (or the project's only motion with one, or oms's own when it has none) for `cues`, `seconds` long, as a 16-bit mono WAV,
 * with what it holds. A cue whose role the motion's sound does not know is refused: it would be silence.
 */
export async function effectsTrack(dir: string, cues: Cue[], seconds: number, id?: string): Promise<{ motion: string; wav: Buffer; report: EffectsReport }> {
  if (!(seconds > 0) || !Number.isFinite(seconds)) throw new Error('The track needs a length in seconds: the film\'s, as `oms check` gives it.');
  const sounds = await motionSounds(dir);
  const chosen = id ? sounds.find((s) => s.id === id) : sounds.length === 1 ? sounds[0] : sounds.length ? undefined : { id: DEFAULT_SOUND_ID, file: '' };
  if (!chosen) {
    const have = sounds.map((s) => s.id).join(', ') || 'none';
    throw new Error(id ? `The project holds no motion ${id} with a sound (react/sound.json); those with one: ${have}.` : `Name the motion whose sound to use: ${have}.`);
  }
  const sound = chosen.file ? (JSON.parse(await readFile(chosen.file, 'utf8')) as Sound) : DEFAULT_SOUND;
  const issues = soundIssues(sound);
  if (issues.length) throw new Error(`${chosen.id}'s sound.json: ${issues.join('; ')}`);
  const late = cues.filter((cue) => cue.at >= seconds);
  if (late.length) throw new Error(`Cue at ${late[0]!.at} s is past the track's ${seconds} s.`);
  const roles = ROLES.filter((role) => sound.roles[role]);
  const unknown = cues.filter((cue) => !sound.roles[cue.role]);
  if (unknown.length)
    throw new Error(`${chosen.id}'s sound has no ${[...new Set(unknown.map((cue) => cue.role))].join(', ')}: its roles are ${roles.join(', ')}. Use one of them for ${unknown.map((cue) => `${cue.at}:${cue.role}`).join(', ')}.`);
  const samples = renderSound({ seconds, cues, sound, rate: RATE });
  // Each cue's own peak: in the same track rendered without its bed, over the cue's span (at least a third of a second)
  // but not past the next cue's start, so neither the bed nor a neighbour is counted as the cue.
  const hits = sound.bed ? renderSound({ seconds, cues, sound: { ...sound, bed: 0 }, rate: RATE }) : samples;
  const starts = [...new Set(cues.map((cue) => cue.at))].sort((x, y) => x - y);
  const window = (cue: Cue) => {
    const next = starts.find((at) => at > cue.at) ?? Infinity;
    const end = Math.min(cue.at + Math.max(cue.dur ?? 0, 0.33), Math.max(next, cue.at + 0.05));
    return hits.subarray(Math.floor(cue.at * RATE), Math.min(hits.length, Math.ceil(end * RATE)));
  };
  const whole = levels(samples);
  const report: EffectsReport = {
    motion: chosen.id,
    roles,
    peak: whole.peak,
    rms: whole.rms,
    cues: cues.map((cue) => {
      const { peak } = levels(window(cue));
      return { ...cue, peak, silent: peak < SILENT_DB };
    }),
  };
  return { motion: chosen.id, wav: wav16(samples, RATE), report };
}

/** Mono samples as a 16-bit PCM WAV, held inside full scale. */
function wav16(samples: Float32Array, rate: number): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i]!)) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}
