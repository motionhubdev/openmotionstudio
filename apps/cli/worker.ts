// oms's check, still and render: the Studio's own build, review, sound lookup and export, with the film drawn in
// headless Chrome (chrome.ts) and encoded by the person's ffmpeg (ffmpeg.ts). Bundled into dist/worker.cjs beside the
// Studio's preview scripts (resources/preview/).
import { createHash } from 'node:crypto';
import { readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { availableParallelism, freemem, homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import type { FilmReview } from '../desktop/src/shared/api';
import { buildFilmOnce, located } from '../desktop/src/main/film/film';
import { soundFile } from '../desktop/src/main/film/mix';
import { reviewBuild } from '../desktop/src/main/film/review';
import { exportFrames } from '../desktop/src/main/film/capture';
import { findFfmpeg } from './ffmpeg';
import { findChrome, openChromeStage } from './chrome';
import { voiceFilm } from '../desktop/src/main/narration';
import { TRANSCRIBERS, voiceRecording, type RecordedFilm } from '../desktop/src/main/recording';
import { VOICE_NAMES, voicesOf, type VoiceSetup } from '../desktop/src/main/voice';
import type { VoiceKind, VoicedFilm } from '../desktop/src/shared/api';
import { removeBuilt, servePlayer, watchProject, writePlayer } from './web';
import { OMS_EXTENSION, packProject } from '../desktop/src/main/oms-file';

// Motions come from motionhub when a film asks for one, taken into the project as the Studio and @motionhub/cli take them.
export { motionWords, searchMotions, useMotion } from '../desktop/src/main/motions';
// Sound effects from the project's motion's sound, for the cues of its picture.
export { effectsTrack, parseCues } from '../desktop/src/main/film/effects';
import { bundledSources, takeFont } from './font';
/**
 * A face from Google Fonts cut to the characters the film writes: its project's sources and every source the film is
 * built from, so words it imports from outside the project are in it too. A film that does not build is said first.
 */
export async function font(dir: string, scratch: string, family: string, weights: number[], ofl: string): Promise<{ files: string[]; characters: number; licence: string }> {
  const output = join(scratch, 'build');
  const build = await buildFilmOnce(dir, output);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  return takeFont(dir, family, weights, ofl, bundledSources(await readFile(join(output, `film-${build.version}.js`), 'utf8')));
}

/** The SIL Open Font License's text, beside this worker. */
export const OFL = join(__dirname, 'OFL.txt');

const studio = join(__dirname, 'resources', 'preview');

/**
 * Builds the film in `dir` into `scratch`, which also holds each Chrome's own profile; Chrome is found only to open a
 * built film.
 */
async function opener(dir: string, scratch: string) {
  const output = join(scratch, 'build');
  const build = await buildFilmOnce(dir, output);
  let opened = 0;
  // A page's error, said where in the project's sources it was thrown.
  const where = async (error: unknown) => new Error(await located(error instanceof Error ? error.message : String(error), join(output, `film-${build.version}.js`), dir));
  const open = async () => openChromeStage(await findChrome(), dir, output, studio, join(scratch, `profile-${opened++}`)).catch(async (error) => Promise.reject(await where(error)));
  return { build, output, open, where };
}

/** How many Chromes draw a render at once: one a core, as memory allows (about 1.5 GB each, as VisoTalk measured), at most 8. */
export const renderStages = (cores = availableParallelism(), free = freemem()): number =>
  Math.max(1, Math.min(cores, Math.floor(free / 1.5e9), 8));

/** The film's review: build errors, its scenes and layers, a draw of its start, each scene's middle and its end, and its sounds. */
export async function check(dir: string, scratch: string): Promise<FilmReview> {
  const { build, output, open } = await opener(dir, scratch);
  const review = await reviewBuild(build, open, undefined, { bundle: join(output, `film-${build.version}.js`), dir });
  // The narration, as the Studio's agent hears of it: lines its voice has not spoken yet, and speech cut short.
  const lines = (review.film?.scenes ?? []).flatMap((scene) => scene.lines.map((line) => ({ ...line, scene: scene.id }))).filter((line) => line.text.trim());
  const unvoiced = lines.filter((line) => !line.voiced);
  if (review.film?.voice && unvoiced.length)
    review.issues.push({ id: 'unvoiced', kind: 'export', severity: 'warning', text: `Not yet spoken in ${review.film.voice}: ${unvoiced.map((line) => `"${line.text}"`).join(' ')}. oms voice speaks them.` });
  for (const line of lines)
    if (line.over)
      review.issues.push({ id: `voice-over-${line.id}`, kind: 'layout', severity: 'warning', text: `"${line.text}" is cut ${Math.round(line.over * 10) / 10} s short by what follows it: give it more room, or fewer words.`, time: line.start, scene: line.scene });
  for (const sound of review.film?.sounds ?? []) {
    try {
      await soundFile(dir, sound.src, output);
    } catch (error) {
      review.issues.push({ id: 'sound-' + sound.src, kind: 'export', severity: 'error', text: String(error) });
    }
  }
  return review;
}

/** Where a render keeps its finished segments until its video is whole, so the same render started again resumes. */
const RENDERS = join(homedir(), '.cache', 'oms', 'renders');
/** Segments of a render not touched for this long are a render nobody came back to, and are removed. */
const KEPT_MS = 7 * 24 * 3600_000;

/**
 * The film as an MP4 at `file`, with its sounds, narration and lines as the Studio exports them (and the lines beside it
 * as SubRip), reporting the share done (0 to 1); stopped, it keeps its finished segments, and the same render started
 * again draws only the rest. Nothing is drawn before ffmpeg is known to have what the render needs.
 */
export async function render(dir: string, scratch: string, file: string, onProgress: (done: number) => void, signal: AbortSignal): Promise<void> {
  const { build, output, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const ffmpeg = await findFfmpeg();
  // Kept by the Chrome that drew them: another one may draw other pixels.
  const resume = join(RENDERS, createHash('sha256').update(await findChrome()).digest('hex').slice(0, 12));
  for (const chrome of await readdir(RENDERS).catch(() => [] as string[]))
    for (const kept of await readdir(join(RENDERS, chrome)).catch(() => [] as string[])) {
      const at = join(RENDERS, chrome, kept);
      if (Date.now() - (await stat(at)).mtimeMs > KEPT_MS) await rm(at, { recursive: true, force: true });
    }
  await exportFrames(dir, build.version, file, onProgress, signal, open, ffmpeg, { output, stages: renderStages(), resume });
}

/** The preview core and the web player's page script, beside this worker. */
const scripts = { core: join(studio, 'core.js'), player: join(__dirname, 'player.js') };

/** The film's size, length, sounds and lines, read by drawing it once. */
async function filmOf(open: () => Promise<{ film: import('../desktop/src/shared/preview').FilmInfo; close(): void | Promise<void> }>) {
  const stage = await open();
  try {
    return stage.film;
  } finally {
    await stage.close();
  }
}

/** The film as a web player in the new folder `out` (web.ts): plays in a browser without a render. */
/** The project in `dir` packed into the film file `out` (ADR 0019), written whole, then moved into place. */
export async function pack(dir: string, out: string): Promise<{ files: number; bytes: number }> {
  if (!out.toLowerCase().endsWith(OMS_EXTENSION)) throw new Error(`Name a film file ending in ${OMS_EXTENSION}.`);
  const { bytes, files } = await packProject(dir);
  const partial = `${out}.partial`;
  await writeFile(partial, bytes);
  await rename(partial, out);
  return { files, bytes: bytes.length };
}

export async function player(dir: string, scratch: string, out: string): Promise<{ soundtrack: boolean }> {
  const { build, output, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const film = await filmOf(open);
  return writePlayer(dir, output, film, out, { scripts, work: join(scratch, 'mix'), ffmpeg: findFfmpeg, title: basename(resolve(dir)) });
}

/**
 * Plays the film in `dir` at http://127.0.0.1:`port`/ and builds it again whenever a file in the project changes: a
 * page open there comes back at the time it was at. A build that fails is said, and the last good one stays served.
 */
export async function preview(dir: string, scratch: string, port: number, say: (text: string) => void): Promise<() => Promise<void>> {
  let n = 0;
  let served = '';
  const buildOnce = async () => {
    const at = join(scratch, `build-${++n}`);
    const { build, output, open } = await opener(dir, at);
    if (!build.ok) throw new Error(build.errors.join('\n'));
    const out = join(at, 'player');
    await writePlayer(dir, output, await filmOf(open), out, { scripts, work: join(at, 'mix'), ffmpeg: findFfmpeg, title: basename(resolve(dir)), live: true });
    return { at, out };
  };
  const first = await buildOnce();
  served = first.out;
  let last = first.at;
  const { server, built } = servePlayer(() => served, port);
  await new Promise<void>((done, fail) => server.once('listening', done).once('error', fail));
  let busy: Promise<void> = Promise.resolve();
  const stop = watchProject(dir, () => {
    busy = busy.then(async () => {
      try {
        const next = await buildOnce();
        served = next.out;
        await removeBuilt(last);
        last = next.at;
        built();
        say('Built again.');
      } catch (error) {
        say(`The film did not build; still playing the last one that did:\n${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });
  return async () => {
    stop();
    await busy;
    await new Promise((done) => server.close(done));
  };
}

/** The environment variables a voice provider's key and settings are read from: oms keeps no key of its own. */
export const VOICE_ENV: Record<VoiceKind, { key: string; also: string }> = {
  minimax: { key: 'MINIMAX_API_KEY', also: 'MINIMAX_GROUP_ID if the account has one, MINIMAX_REGION=china (or MINIMAX_BASE_URL=https://api.minimaxi.com) for an account on minimaxi.com, MINIMAX_TTS_MODEL' },
  elevenlabs: { key: 'ELEVENLABS_API_KEY', also: 'ELEVENLABS_MODEL' },
  openai: { key: 'OPENAI_API_KEY', also: 'OPENAI_TTS_MODEL' },
  azure: { key: 'AZURE_SPEECH_KEY', also: 'AZURE_SPEECH_REGION, which it needs' },
};

/** A provider set up from the environment, as the Studio sets one up in Models; a missing key says which variable. */
export function voiceSetup(kind: VoiceKind, env: NodeJS.ProcessEnv = process.env): VoiceSetup {
  const { key, also } = VOICE_ENV[kind];
  const value = env[key]?.trim();
  if (!value) throw new Error(`${VOICE_NAMES[kind]} speaks with the key in ${key} (and ${also}): set it in the environment oms runs in. oms reads keys from there only and writes them nowhere.`);
  switch (kind) {
    case 'minimax': {
      // MINIMAX_BASE_URL as VisoTalk read it: an account on minimaxi.com is China's site.
      const china = env.MINIMAX_REGION?.trim() === 'china' || /(^|\/\/)api\.minimaxi\.com/.test(env.MINIMAX_BASE_URL?.trim() ?? '');
      return { kind, key: value, groupId: env.MINIMAX_GROUP_ID?.trim() || undefined, region: china ? 'china' : 'global', model: env.MINIMAX_TTS_MODEL?.trim() || undefined };
    }
    case 'elevenlabs':
      return { kind, key: value, model: env.ELEVENLABS_MODEL?.trim() || undefined };
    case 'openai':
      return { kind, key: value, model: env.OPENAI_TTS_MODEL?.trim() || undefined };
    case 'azure': {
      const region = env.AZURE_SPEECH_REGION?.trim();
      if (!region) throw new Error('Azure speaks in a region: set AZURE_SPEECH_REGION (as eastasia) beside AZURE_SPEECH_KEY.');
      return { kind, key: value, region };
    }
  }
}

/**
 * Speaks the film's lines in its <Film voice> into the project's voice/, as the Studio's Voice the film does: only lines
 * whose words changed are spoken (and paid for); `onLine` hears each line as it is done.
 */
export async function voice(dir: string, scratch: string, onLine: (done: number, of: number) => void): Promise<VoicedFilm> {
  const { build, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const film = await filmOf(open);
  if (!film.voice) throw new Error('The film names no voice: give its <Film> one, as voice="minimax:Chinese (Mandarin)_News_Anchor".');
  return voiceFilm(dir, film, async (kind) => voiceSetup(kind), await findFfmpeg(), onLine);
}

/** Where the words a recording was heard to say are kept, by its hash and the provider: one take is paid for once. */
const TRANSCRIPTS = join(homedir(), '.cache', 'oms', 'transcripts');

/**
 * The film's narration from the person's own recording `file`, one take of its lines in order, in its <Film
 * voice="recording:…">: transcribed by `kind` (else the first of MiniMax, OpenAI and ElevenLabs whose key the
 * environment holds), matched to the lines and cut into voice/.
 */
export async function record(dir: string, scratch: string, file: string, kind: VoiceKind | undefined, onStep: (text: string) => void): Promise<RecordedFilm> {
  const by = kind ?? TRANSCRIBERS.find((k) => process.env[VOICE_ENV[k].key]?.trim());
  if (!by) throw new Error(`A recording is transcribed by MiniMax, OpenAI or ElevenLabs, with its key in ${TRANSCRIBERS.map((k) => VOICE_ENV[k].key).join(', ')}: set one in the environment oms runs in.`);
  if (!TRANSCRIBERS.includes(by)) throw new Error(`${VOICE_NAMES[by]} does not transcribe a recording here: use ${TRANSCRIBERS.join(', ')}.`);
  const { build, open } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  return voiceRecording(dir, await filmOf(open), file, voiceSetup(by), await findFfmpeg(), TRANSCRIPTS, onStep);
}

/** What `oms voice --recording` says it did: who transcribed, what was cut, and every place the take differs from the script. */
export function recordingReport(done: RecordedFilm, file: string): string[] {
  const quote = (text: string) => `"${text}"`;
  const change = ({ written, heard }: RecordedFilm['changed'][number]['changes'][number]) =>
    !written ? `added ${quote(heard)}` : !heard ? `${quote(written)} not heard` : `${quote(written)} heard as ${quote(heard)}`;
  const by = VOICE_NAMES[done.transcriber];
  const report = [
    done.cached ? `Used the transcript kept from an earlier import of this take (by ${by}): nothing was paid.` : `Transcribed by ${by}.`,
    `Cut ${done.lines} line${done.lines === 1 ? '' : 's'} (${done.seconds.toFixed(1)} s of speech) from ${file} into voice/, ${Math.round(done.heard * 100)}% of the script heard as written.`,
  ];
  if (done.changed.length)
    report.push(
      'Read otherwise than written, and cut all the same: each caption shows the written words, timed by what was said.',
      ...done.changed.map((line) => `- ${line.id}: ${line.changes.map(change).join('; ')}`),
      'A transcriber may spell a homophone or a number its own way: listen where unsure. For a caption that shows what was said, write the line as it was said and run this again (the transcript is kept, so nothing is paid).',
    );
  if (done.asides.length) report.push(`Said between the lines, and in no clip: ${done.asides.map((aside) => `${quote(aside.text)} at ${aside.at.toFixed(1)} s`).join(', ')}.`);
  report.push('Run oms check: each line now lasts as long as it was said.');
  return report;
}

/** The voices a provider offers, with the key in the environment. */
export const voices = (kind: VoiceKind) => voicesOf(voiceSetup(kind));

/** The frame at `seconds`, as a PNG. */
export async function still(dir: string, scratch: string, seconds: number): Promise<Buffer> {
  const { build, open, where } = await opener(dir, scratch);
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const stage = await open();
  try {
    if (!(seconds >= 0 && seconds < stage.film.seconds)) throw new Error(`Time must be in [0, ${stage.film.seconds}) seconds.`);
    return await stage.png(seconds).catch(async (error) => Promise.reject(await where(error)));
  } finally {
    await stage.close();
  }
}
