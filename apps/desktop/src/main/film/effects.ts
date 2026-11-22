// A film's sound effects from its motion's sound (react/sound.json, motionhub's SPEC.md): the cues the film's picture
// makes (something lands, moves, is drawn, counts, cuts, goes), rendered by @motionhub/runtime/sound, the same synth
// that gives a motion's reel its sound on motionhub.dev, into a WAV in the project that a <Sound> plays.

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

/** The sound of motion `id` (or the project's only motion with one) for `cues`, `seconds` long, as a 16-bit mono WAV. */
export async function effectsTrack(dir: string, cues: Cue[], seconds: number, id?: string): Promise<{ motion: string; wav: Buffer }> {
  if (!(seconds > 0) || !Number.isFinite(seconds)) throw new Error('The track needs a length in seconds: the film\'s, as `oms check` gives it.');
  const sounds = await motionSounds(dir);
  const chosen = id ? sounds.find((s) => s.id === id) : sounds.length === 1 ? sounds[0] : undefined;
  if (!chosen) {
    const have = sounds.map((s) => s.id).join(', ') || 'none';
    throw new Error(id ? `The project holds no motion ${id} with a sound (react/sound.json); those with one: ${have}.`
      : sounds.length ? `Name the motion whose sound to use: ${have}.` : 'No motion in the project has a sound (react/sound.json). Take one with `oms motion use`, or bring sound files of your own.');
  }
  const sound = JSON.parse(await readFile(chosen.file, 'utf8')) as Sound;
  const issues = soundIssues(sound);
  if (issues.length) throw new Error(`${chosen.id}'s sound.json: ${issues.join('; ')}`);
  const late = cues.filter((cue) => cue.at >= seconds);
  if (late.length) throw new Error(`Cue at ${late[0]!.at} s is past the track's ${seconds} s.`);
  return { motion: chosen.id, wav: wav16(renderSound({ seconds, cues, sound, rate: RATE }), RATE) };
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
