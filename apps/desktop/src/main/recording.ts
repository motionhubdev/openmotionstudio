// A narration from the person's own recording: one take of the film's lines, read as they are written, transcribed with
// each word's time by the person's provider, matched to the lines character by character, and cut into one clip a line
// in voice/, as a spoken narration's are (narration.ts). The film, its captions and every export then take it as they
// take a voice's. A line's words keep the script's own text, each timed by the characters heard for it, so a caption
// shows what was written; a line read too differently from its words is said, and nothing is written.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { VoiceKind } from '../shared/api';
import type { FilmInfo } from '../shared/preview';
import { mediaSeconds } from './film/mix';
import { type Clip, type Narration, VOICE_DIR, clipKey, keepNarration, normalised } from './narration';
import { type VoiceIo, type VoiceSetup, type Word, VOICE_NAMES } from './voice';

/** The providers that transcribe with each word's time. */
export const TRANSCRIBERS: VoiceKind[] = ['minimax', 'openai', 'elevenlabs'];

const NETWORK: VoiceIo = { fetch: (...args) => fetch(...args), WebSocket: WebSocket as unknown as VoiceIo['WebSocket'] };

/** How much of a recording one request transcribes: MiniMax takes at most 470 s, OpenAI 25 MB. */
const CHUNK_SECONDS = 300;

/** Below this share of its characters heard as written, a line is said to be read otherwise, and nothing is cut. */
export const HEARD_ENOUGH = 0.75;

const round = (t: number) => Math.round(t * 1000) / 1000;

/** The language a script is in, as the transcribers take it: Chinese, Japanese, Korean or English. */
export function languageOf(text: string): string {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return 'ja';
  if (/\p{Script=Hangul}/u.test(text)) return 'ko';
  if (/\p{Script=Han}/u.test(text)) return 'zh';
  return 'en';
}

async function answer<T>(response: Response, who: string): Promise<T> {
  if (!response.ok) throw new Error(`${who} could not transcribe the recording: ${response.status} ${(await response.text()).slice(0, 300)}`);
  return (await response.json()) as T;
}

/** A stretch of a recording, as FLAC at 16 kHz mono, transcribed with each word's time (seconds into the stretch). */
export async function transcribe(setup: VoiceSetup, flac: Buffer, language: string, io: VoiceIo = NETWORK): Promise<Word[]> {
  const form = new FormData();
  const file = new Blob([new Uint8Array(flac)], { type: 'audio/flac' });
  switch (setup.kind) {
    case 'minimax': {
      const base = setup.region === 'china' ? 'https://api.minimaxi.com' : 'https://api.minimax.io';
      form.set('file', file, 'take.flac');
      form.set('model', 'asr-1.0');
      form.set('response_format', 'verbose_json');
      form.set('timestamp_level', 'word');
      const group = setup.groupId ? `&GroupId=${encodeURIComponent(setup.groupId)}` : '';
      const json = await answer<{ segments?: { text: string; start: number; end: number }[]; base_resp?: { status_code?: number; status_msg?: string } }>(
        await io.fetch(`${base}/v1/speech_to_text?language=${encodeURIComponent(language)}${group}`, { method: 'POST', headers: { Authorization: `Bearer ${setup.key}` }, body: form }),
        'MiniMax',
      );
      if (json.base_resp?.status_code) throw new Error(`MiniMax could not transcribe the recording: ${json.base_resp.status_msg ?? json.base_resp.status_code}.`);
      if (!Array.isArray(json.segments)) throw new Error('MiniMax gave no words for the recording.');
      return json.segments.filter((w) => w.text?.trim()).map((w) => ({ text: w.text.trim(), start: round(w.start), end: round(w.end) }));
    }
    case 'openai': {
      form.set('file', file, 'take.flac');
      form.set('model', 'whisper-1');
      form.set('language', language);
      form.set('response_format', 'verbose_json');
      form.append('timestamp_granularities[]', 'word');
      const json = await answer<{ words?: { word: string; start: number; end: number }[] }>(
        await io.fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${setup.key}` }, body: form }),
        'OpenAI',
      );
      return (json.words ?? []).filter((w) => w.word.trim()).map((w) => ({ text: w.word.trim(), start: round(w.start), end: round(w.end) }));
    }
    case 'elevenlabs': {
      form.set('file', file, 'take.flac');
      form.set('model_id', 'scribe_v1');
      form.set('language_code', language);
      form.set('timestamps_granularity', 'word');
      const json = await answer<{ words?: { text: string; start: number; end: number; type?: string }[] }>(
        await io.fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': setup.key }, body: form }),
        'ElevenLabs',
      );
      return (json.words ?? []).filter((w) => (w.type ?? 'word') === 'word' && w.text.trim()).map((w) => ({ text: w.text.trim(), start: round(w.start), end: round(w.end) }));
    }
    case 'azure':
      throw new Error(`${VOICE_NAMES.azure} does not transcribe a recording here: use ${TRANSCRIBERS.map((k) => VOICE_NAMES[k]).join(', ')}.`);
  }
}

/** A character as it is compared: what is spoken (letters and digits), folded; anything else is not compared. */
const SPOKEN = /[\p{L}\p{N}]/u;
const folded = (c: string) => c.normalize('NFKC').toLowerCase();

/** Han, kana, Hangul and Thai are a word a character, as the providers time them. */
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

/**
 * A line's words as a caption shows them: each unspaced character, or each run of letters and digits, with the marks
 * around it kept to the word before it (to the next for a line's first); and of each, the characters compared.
 */
export function captionWords(text: string): { text: string; spoken: string[] }[] {
  const words: { text: string; spoken: string[] }[] = [];
  let lead = '';
  let open = false;
  for (const char of text) {
    if (/\s/.test(char)) {
      open = false;
      continue;
    }
    if (!SPOKEN.test(char)) {
      const last = words.at(-1);
      if (last) last.text += char;
      else lead += char;
      continue;
    }
    const unspaced = UNSPACED.test(char);
    const last = words.at(-1);
    if (open && last && !unspaced && !UNSPACED.test(last.spoken.at(-1) ?? '')) {
      last.text += char;
      last.spoken.push(folded(char));
    } else {
      words.push({ text: lead + char, spoken: [folded(char)] });
      lead = '';
    }
    open = !unspaced;
  }
  return words;
}

/** Where a line was heard in the recording: its span, its words timed, and how much of it was heard as written. */
export interface LineFit {
  id: string;
  text: string;
  start: number;
  end: number;
  words: Word[];
  /** The share of its characters heard as written, 0 to 1. */
  heard: number;
  /** What was heard where it was read. */
  said: string;
}

/** Most character pairs one alignment compares: a recording of about twenty minutes of Chinese. */
const MOST_PAIRS = 60_000_000;

/**
 * The film's `lines`, in order, found in what was `heard` (each word with its time): the characters of both compared
 * as one sequence each, by the fewest edits, so a line read with a word changed, added or left out is still found where
 * it was read. Each of a line's characters takes the time of the character heard for it, or one between its neighbours'.
 */
export function alignLines(lines: { id: string; text: string }[], heard: Word[]): LineFit[] {
  // What was heard, a character at a time, each with its share of its word's time.
  const said: { char: string; start: number; end: number }[] = [];
  for (const word of heard) {
    const chars = [...word.text].filter((c) => SPOKEN.test(c)).map(folded);
    chars.forEach((char, k) => {
      const step = (word.end - word.start) / chars.length;
      said.push({ char, start: word.start + k * step, end: word.start + (k + 1) * step });
    });
  }
  // What is written, a character at a time, each with its line and its word.
  const written: { char: string; line: number; word: number }[] = [];
  const words = lines.map((line, l) => {
    const ws = captionWords(line.text);
    ws.forEach((w, i) => w.spoken.forEach((char) => written.push({ char, line: l, word: i })));
    return ws;
  });
  const n = written.length;
  const m = said.length;
  if (!m) throw new Error('Nothing was heard in the recording.');
  if (n * m > MOST_PAIRS) throw new Error('The recording and the script are too long to match at once: record and import the film in parts.');
  // Edit distance with each step remembered: 0 match or change, 1 a written character not heard, 2 a heard one not written.
  const step = new Uint8Array((n + 1) * (m + 1));
  let before = new Uint32Array(m + 1);
  let row = new Uint32Array(m + 1);
  for (let j = 0; j <= m; j++) (before[j] = j), (step[j] = 2);
  for (let i = 1; i <= n; i++) {
    row[0] = i;
    step[i * (m + 1)] = 1;
    for (let j = 1; j <= m; j++) {
      const change = before[j - 1]! + (written[i - 1]!.char === said[j - 1]!.char ? 0 : 1);
      const skip = before[j]! + 1;
      const extra = row[j - 1]! + 1;
      const best = Math.min(change, skip, extra);
      row[j] = best;
      step[i * (m + 1) + j] = best === change ? 0 : best === skip ? 1 : 2;
    }
    [before, row] = [row, before];
  }
  // Back from the end: each written character's heard one, if any, and whether it was heard as written.
  const match = new Int32Array(n).fill(-1);
  const same = new Uint8Array(n);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    const s = step[i * (m + 1) + j];
    if (i > 0 && j > 0 && s === 0) {
      match[i - 1] = j - 1;
      same[i - 1] = written[i - 1]!.char === said[j - 1]!.char ? 1 : 0;
      i--;
      j--;
    } else if (i > 0 && (j === 0 || s === 1)) i--;
    else j--;
  }
  // Each written character's time: its heard one's, or one between the neighbours that have one.
  const start = new Float64Array(n);
  const end = new Float64Array(n);
  for (let i = 0; i < n; i++) if (match[i]! >= 0) (start[i] = said[match[i]!]!.start), (end[i] = said[match[i]!]!.end);
  for (let i = 0; i < n; i++) {
    if (match[i]! >= 0) continue;
    let a = i - 1;
    while (a >= 0 && match[a]! < 0) a--;
    let b = i + 1;
    while (b < n && match[b]! < 0) b++;
    const from = a >= 0 ? end[a]! : b < n ? start[b]! : 0;
    const to = b < n ? start[b]! : from;
    const share = (to - from) / (b - a);
    start[i] = from + share * (i - a - 1);
    end[i] = start[i]! + share;
  }
  // What was heard where a line was read: all between the last character heard for the lines before it and the first
  // heard for the lines after it, so words said in place of its own are shown too.
  const heardBy = lines.map((_, l) => written.map((w, i) => (w.line === l ? match[i]! : -1)).filter((j) => j >= 0));
  return lines.map((line, l) => {
    const own = written.map((w, i) => ({ ...w, i })).filter((w) => w.line === l);
    const first = own[0]?.i ?? 0;
    const last = own.at(-1)?.i ?? 0;
    const heardIn = own.filter((w) => same[w.i]).length;
    const from = Math.max(-1, ...heardBy.slice(0, l).flat()) + 1;
    const to = Math.min(m, ...heardBy.slice(l + 1).flat());
    return {
      id: line.id,
      text: line.text,
      start: round(start[first]!),
      end: round(end[last]!),
      words: words[l]!.map((w, k) => {
        const chars = own.filter((c) => c.word === k);
        return { text: w.text, start: round(start[chars[0]!.i]!), end: round(end[chars.at(-1)!.i]!) };
      }),
      heard: own.length ? heardIn / own.length : 0,
      said: said.slice(from, to).map((c) => c.char).join(''),
    };
  });
}

const run = (ffmpeg: string, args: string[]) =>
  new Promise<void>((done, fail) =>
    execFile(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { timeout: 300_000, windowsHide: true }, (error, _out, stderr) =>
      error ? fail(new Error(`ffmpeg could not read the recording: ${String(stderr).trim().split('\n').pop() || error.message}`)) : done(),
    ),
  );

/** What importing a recording did. */
export interface RecordedFilm {
  lines: number;
  seconds: number;
  /** Characters of the script heard as written, 0 to 1, over the whole film. */
  heard: number;
}

/**
 * The film's narration from `file`, one take of its lines in order: transcribed through `setup` (kept by the file's hash
 * in `cache`), matched to the lines, and cut into voice/ in the film's voice, which names a recording
 * (`recording:<name>`). A line heard less than HEARD_ENOUGH as written is said with what was heard, and nothing is
 * written.
 */
export async function voiceRecording(
  dir: string,
  film: Pick<FilmInfo, 'scenes' | 'voice'>,
  file: string,
  setup: VoiceSetup,
  ffmpeg: string,
  cache: string,
  onStep: (text: string) => void = () => {},
  io: VoiceIo = NETWORK,
): Promise<RecordedFilm> {
  if (!film.voice?.startsWith('recording:')) throw new Error(`A recording narrates a film whose voice names it: give its <Film> voice="recording:take"${film.voice ? ` instead of "${film.voice}"` : ''}.`);
  const lines = film.scenes.flatMap((scene) => scene.lines).filter((line) => line.text.trim() && captionWords(line.text).length);
  if (!lines.length) throw new Error('The film has no lines to match the recording to: write what each scene says as its <Line>s.');
  if (!existsSync(file)) throw new Error(`There is no recording at ${file}.`);
  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  const language = languageOf(lines.map((line) => line.text).join(''));
  const transcript = join(cache, `${hash.slice(0, 32)}-${setup.kind}-${language}.json`);
  let heard: Word[];
  if (existsSync(transcript)) heard = JSON.parse(await readFile(transcript, 'utf8')) as Word[];
  else {
    const seconds = await mediaSeconds(ffmpeg, file);
    const work = await mkdtemp(join(tmpdir(), 'oms-recording-'));
    heard = [];
    try {
      for (let offset = 0; offset < seconds; offset += CHUNK_SECONDS) {
        onStep(`Transcribing ${Math.round(offset)}–${Math.round(Math.min(seconds, offset + CHUNK_SECONDS))} s of ${Math.round(seconds)} s`);
        const flac = join(work, 'part.flac');
        await run(ffmpeg, ['-ss', String(offset), '-t', String(CHUNK_SECONDS), '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'flac', flac]);
        for (const word of await transcribe(setup, await readFile(flac), language, io))
          heard.push({ text: word.text, start: round(word.start + offset), end: round(word.end + offset) });
      }
    } finally {
      await rm(work, { recursive: true, force: true });
    }
    await mkdir(cache, { recursive: true });
    await writeFile(`${transcript}.partial`, JSON.stringify(heard));
    await rename(`${transcript}.partial`, transcript);
  }
  const fits = alignLines(lines, heard);
  const unheard = fits.filter((fit) => fit.heard < HEARD_ENOUGH);
  if (unheard.length)
    throw new Error(
      `The recording does not read ${unheard.length === 1 ? 'this line' : 'these lines'} as written, so nothing was cut:\n${unheard
        .map((fit) => `- ${fit.id}: written "${fit.text}", heard "${fit.said || '(nothing)'}" (${Math.round(fit.heard * 100)}% as written)`)
        .join('\n')}\nRecord ${unheard.length === 1 ? 'it' : 'them'} again as written, or write the lines as they were said.`,
    );
  // Each line cut a little wider than its words, never into its neighbours'.
  const folder = join(dir, VOICE_DIR);
  await mkdir(folder, { recursive: true });
  const narration: Narration = { voice: film.voice, lines: {} };
  let total = 0;
  for (const [i, fit] of fits.entries()) {
    onStep(`Cutting line ${i + 1} of ${fits.length}`);
    const from = Math.max(i ? (fits[i - 1]!.end + fit.start) / 2 : 0, fit.start - 0.12);
    const to = Math.min(i < fits.length - 1 ? (fit.end + fits[i + 1]!.start) / 2 : Infinity, fit.end + 0.2);
    const key = clipKey(film.voice, `take:${hash.slice(0, 16)}`, fit.text);
    narration.lines[fit.id] = key;
    await normalised(ffmpeg, file, join(folder, `${key}.partial.mp3`), [from, to]);
    await rename(join(folder, `${key}.partial.mp3`), join(folder, `${key}.mp3`));
    const seconds = await mediaSeconds(ffmpeg, join(folder, `${key}.mp3`));
    const clip: Clip = {
      text: fit.text,
      voice: film.voice,
      seconds,
      words: fit.words.map((w) => ({ text: w.text, start: round(Math.max(0, w.start - from)), end: round(Math.min(seconds, w.end - from)) })),
    };
    await writeFile(join(folder, `${key}.json`), `${JSON.stringify(clip, null, 2)}\n`);
    total += seconds;
  }
  await keepNarration(folder, narration);
  const characters = fits.reduce((sum, fit) => sum + captionWords(fit.text).reduce((n, w) => n + w.spoken.length, 0), 0);
  return { lines: fits.length, seconds: round(total), heard: fits.reduce((sum, fit) => sum + fit.heard * captionWords(fit.text).reduce((n, w) => n + w.spoken.length, 0), 0) / characters };
}
