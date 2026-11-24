#!/usr/bin/env node
import { constants, existsSync } from 'node:fs';
import { cp, copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = dirname(fileURLToPath(import.meta.url));
const usage = 'oms install <claude|codex> | init <folder> | check <folder> [--json] | still <folder> --at <seconds> --out <new.png> | render <folder> --out <new.mp4> | player <folder> --out <new folder> | pack <folder> [--out <file.oms>] | preview <folder> [--port <n>] | motion search <words…> [--json] | motion use <@scope/slug> <folder> | sound <folder> --cues <at:role,…> --seconds <s> --out <new.wav> [--motion <id>] | font <folder> --family <name[:400,700]>… [--weights 400,700] | voice <folder> [--recording <file> [--transcribe <minimax|openai|elevenlabs>]] | voice --list <minimax|elevenlabs|openai|azure>';

/** `oms motion search <words…> [--json]` and `oms motion use <@scope/slug> <folder>`: motions from motionhub, on demand. */
async function motion(args) {
  const { values, positionals } = parseArgs({ args, options: { json: { type: 'boolean' } }, allowPositionals: true });
  const [action, ...rest] = positionals;
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  if (action === 'search') {
    const found = await worker.searchMotions(rest.join(' '));
    if (values.json) return console.log(JSON.stringify(found));
    if (!found.length) return console.log(`No motion has any of those words. The words motions are tagged with: ${(await worker.motionWords()).slice(0, 40).join(', ')}. Or run oms motion search with none to list them all.`);
    for (const m of found) console.log(`${m.id}: ${m.name}. ${m.line}${m.fit ? ` For: ${m.fit}` : ''}`);
    return;
  }
  if (action === 'use' && rest.length === 2) {
    const used = await worker.useMotion(resolve(rest[1]), rest[0]);
    return console.log(`Took ${used.id} into ${used.path}. Read its MOTION.md and tokens.json before drawing in it.`);
  }
  throw new Error(usage);
}

/**
 * `oms sound <folder> --cues <at:role,…> --seconds <s> --out <new.wav> [--motion <id>]`: the project's motion's sound
 * for those cues, a track the film's length, written as a new WAV inside the project (--out is a path from the current
 * directory, as still's and render's are) for a <Sound> to play.
 */
async function sound(args) {
  const { values, positionals } = parseArgs({ args, options: { cues: { type: 'string' }, seconds: { type: 'string' }, out: { type: 'string' }, motion: { type: 'string' } }, allowPositionals: true });
  if (positionals.length !== 1 || !values.cues || !values.seconds || !values.out?.toLowerCase().endsWith('.wav')) throw new Error(usage);
  const dir = resolve(positionals[0]);
  // Like still's and render's, --out is a path from where oms runs; the track must be inside the project.
  const file = resolve(values.out);
  if (!file.startsWith(dir + sep)) throw new Error(`${file} is outside the project ${dir}: a film plays only its own files. Give a path inside it, as "${join(positionals[0], 'media', 'effects.wav')}".`);
  if (existsSync(file)) throw new Error(`${file} is there already: name a new file.`);
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  const { motion, wav, report } = await worker.effectsTrack(dir, worker.parseCues(values.cues), Number(values.seconds), values.motion);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, wav, { flag: 'wx' });
  const src = relative(dir, file).split(sep).join('/');
  const db = (value) => (value === -Infinity ? 'silent' : `${value.toFixed(1)} dBFS`);
  console.log(`Wrote ${src} from ${motion}'s sound (roles: ${report.roles.join(', ')}). Play it across the film: <Sound src="${src}" />`);
  console.log(`Track: peak ${db(report.peak)}, average ${db(report.rms)}.`);
  for (const cue of report.cues) console.log(`  ${cue.at}s ${cue.role}${cue.dur ? ` (${cue.dur}s)` : ''}: peak ${db(cue.peak)}${cue.silent ? '  <- not heard: its voice made no sound here' : ''}`);
}

/**
 * `oms font <folder> --family <name> [--weights 400,700]`: a face from Google Fonts cut to the characters the film
 * writes (its sources and what it imports from outside the project), into its media/fonts/ with its licence; run again
 * when the words change.
 */
async function font(args) {
  const { values, positionals } = parseArgs({ args, options: { family: { type: 'string', multiple: true }, weights: { type: 'string' } }, allowPositionals: true });
  if (positionals.length !== 1 || !values.family?.length) throw new Error(usage);
  const dir = resolve(positionals[0]);
  if (!existsSync(join(dir, 'film.tsx'))) throw new Error(`${dir} holds no film.tsx: name the project folder.`);
  const weightsOf = (text) => text.split(',').map((w) => Number(w.trim()));
  // Each --family as "Name" (in --weights, 400 and 700 without) or "Name:300,500".
  const asked = values.family.map((given) => {
    const at = given.lastIndexOf(':');
    return at > 0 ? { family: given.slice(0, at), weights: weightsOf(given.slice(at + 1)) } : { family: given, weights: weightsOf(values.weights ?? '400,700') };
  });
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  const { readFile } = await import('node:fs/promises');
  const ofl = await readFile(worker.OFL, 'utf8');
  const name = (file) => file.replace(/^.*\//, '').replace(/\.ttf$/, '').replace(/-/g, '_').replace(/^(\d)/, '_$1');
  const declared = [];
  const scratch = await mkdtemp(join(tmpdir(), 'oms-font-'));
  try {
    for (const { family, weights } of asked) {
      const { files, characters, licence } = await worker.font(dir, scratch, family, weights, ofl);
      console.log(`Wrote ${files.join(', ')}: ${family} cut to the ${characters} characters the film writes (${licence}).`);
      for (const file of files.filter((f) => f.endsWith('.ttf'))) declared.push({ family, file, weight: /-(\d+)\.ttf$/.exec(file)[1] });
    }
  } finally {
    await rm(scratch, { recursive: true, force: true, maxRetries: 4 });
  }
  console.log('Run this again when the words change. Declare them where the film draws:');
  for (const { file } of declared) console.log(`  import ${name(file)} from './${file}';`);
  console.log('  <style>{`');
  for (const { family, file, weight } of declared) console.log(`    @font-face { font-family: '${family}'; font-weight: ${weight}; src: url(\${${name(file)}}); }`);
  console.log('  `}</style>');
}

/**
 * `oms voice <folder>`: the film's lines spoken in its <Film voice> into voice/, only those whose words changed, with the
 * key from the environment. `oms voice --list <provider>`: the voices that provider offers.
 */
async function voice(args) {
  const { values, positionals } = parseArgs({ args, options: { list: { type: 'string' }, recording: { type: 'string' }, transcribe: { type: 'string' } }, allowPositionals: true });
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  if (values.list) {
    if (positionals.length || !Object.hasOwn(worker.VOICE_ENV, values.list)) throw new Error(usage);
    // A tab after the voice, which may hold blanks and brackets itself (minimax:Chinese (Mandarin)_News_Anchor).
    for (const choice of await worker.voices(values.list)) console.log(`${values.list}:${choice.id}${choice.name && choice.name !== choice.id ? `\t${choice.name}` : ''}${choice.language ? `\t(${choice.language})` : ''}`);
    return;
  }
  if (positionals.length !== 1 || (values.transcribe && !values.recording)) throw new Error(usage);
  const dir = resolve(positionals[0]);
  const scratch = await mkdtemp(join(tmpdir(), 'oms-voice-'));
  try {
    if (values.recording) {
      const done = await worker.record(dir, scratch, resolve(values.recording), values.transcribe, (text) => console.error(text));
      return console.log(worker.recordingReport(done, values.recording).join('\n'));
    }
    const done = await worker.voice(dir, scratch, (n, of) => process.stderr.isTTY && process.stderr.write(`\rSpeaking ${n}/${of}`));
    if (process.stderr.isTTY) process.stderr.write('\n');
    console.log(`Spoke ${done.spoken} line${done.spoken === 1 ? '' : 's'} (${done.characters} characters, ${done.seconds.toFixed(1)} s of speech) into voice/; ${done.kept} kept as they were. Run oms check: each voiced line now lasts as long as its speech.`);
  } finally {
    await rm(scratch, { recursive: true, force: true, maxRetries: 4 });
  }
}

async function run() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') return console.log(usage);
  if (command === 'motion') return motion(args);
  if (command === 'sound') return sound(args);
  if (command === 'font') return font(args);
  if (command === 'voice') return voice(args);
  const options = command === 'still' ? { at: { type: 'string' }, out: { type: 'string' } }
    : command === 'render' || command === 'player' || command === 'pack' ? { out: { type: 'string' } }
    : command === 'preview' ? { port: { type: 'string' } }
    : command === 'check' ? { json: { type: 'boolean' } } : {};
  const { values, positionals } = parseArgs({ args, options, allowPositionals: true });
  if (positionals.length !== 1) throw new Error(usage);
  const [target] = positionals;
  if (command === 'install') {
    const homes = { claude: process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'),
      codex: process.env.CODEX_HOME || join(homedir(), '.codex') };
    if (!Object.hasOwn(homes, target)) throw new Error(usage);
    const skills = join(homes[target], 'skills');
    const dest = join(skills, 'oms');
    await mkdir(skills, { recursive: true });
    await mkdir(dest).catch(error => {
      if (error.code === 'EEXIST') throw new Error(`OMS is already installed in ${dest}. To install this version, move that folder aside and run this again.`);
      throw error;
    });
    try {
      // The skill folder is whole as it is: its film format and example film are in it, as `npx skills add` takes it.
      await cp(join(root, 'skills/oms'), dest, { recursive: true });
    } catch (error) {
      await rm(dest, { recursive: true, force: true });
      throw error;
    }
    return console.log(dest);
  }
  const dir = resolve(target);
  if (command === 'init') {
    await mkdir(dir, { recursive: true });
    if ((await readdir(dir)).length) throw new Error('Choose an empty or new project folder.');
    await copyFile(join(root, 'dist/starter.tsx'), join(dir, 'film.tsx'), constants.COPYFILE_EXCL);
    // What oms and the Studio make beside the film, never its own media: renders, their subtitles and stills at the top
    // of the folder, and the Studio's state.
    await writeFile(join(dir, '.gitignore'), '/*.mp4\n/*.srt\n/*.png\n.motion-studio/\n', { flag: 'wx' });
    return console.log(dir);
  }
  if (command === 'pack') {
    // The film as one file for the Studio's Import (ADR 0019): beside the folder unless --out names another place.
    const out = resolve(values.out ?? `${dir}.oms`);
    const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
    const { files, bytes } = await worker.pack(dir, out);
    console.log(out);
    return console.error(`Packed ${files} file${files === 1 ? '' : 's'} (${(bytes / 1024 / 1024).toFixed(1)} MB). In OpenMotionStudio, Import project opens it as a new project; renders, stills and the Studio's state are left out.`);
  }
  if (!['still', 'check', 'render', 'player', 'preview'].includes(command)) throw new Error(usage);
  if (command === 'player' && !values.out) throw new Error(usage);
  const port = values.port === undefined ? 4173 : Number(values.port);
  if (command === 'preview' && !(Number.isInteger(port) && port > 0 && port < 65536)) throw new Error(usage);
  if (command === 'render') {
    if (!values.out?.toLowerCase().endsWith('.mp4')) throw new Error(usage);
    // A render is moved into place whole; it never replaces a video, or the subtitles beside it.
    const subtitles = resolve(values.out).replace(/\.mp4$/i, '') + '.srt';
    for (const file of [resolve(values.out), subtitles]) if (existsSync(file)) throw new Error(`${file} is there already: name a new file.`);
  }
  if (command === 'still' && (!values.at?.trim() || !Number.isFinite(Number(values.at)) || !values.out?.toLowerCase().endsWith('.png'))) throw new Error(usage);
  // The worker builds the film with the Studio's own code and draws it in headless Chrome (worker.ts, chrome.ts).
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  const scratch = await mkdtemp(join(tmpdir(), 'oms-preview-'));
  try {
    if (command === 'render') {
      let shown = -1;
      // Ctrl-C stops the render cleanly: its Chromes closed, its finished segments kept for the next run.
      const stop = new AbortController();
      process.once('SIGINT', () => stop.abort());
      await worker.render(dir, scratch, resolve(values.out), (done) => {
        const percent = Math.floor(done * 100);
        if (percent !== shown && process.stderr.isTTY) process.stderr.write(`\rRendering ${(shown = percent)}%`);
      }, stop.signal);
      if (process.stderr.isTTY) process.stderr.write('\n');
      return console.log(resolve(values.out));
    }
    if (command === 'player') {
      const { soundtrack } = await worker.player(dir, scratch, resolve(values.out));
      console.log(resolve(values.out));
      return console.error(`A web player${soundtrack ? ', with its soundtrack' : ''}: put the folder on any static web host and open index.html, or open it here with \`oms preview "${target}"\`.`);
    }
    if (command === 'preview') {
      const stop = await worker.preview(dir, scratch, port, (text) => console.error(text));
      console.log(`http://127.0.0.1:${port}/`);
      console.error('Playing; it builds again when a file in the project changes. Ctrl-C stops it.');
      await new Promise((done) => process.once('SIGINT', done));
      return await stop();
    }
    if (command === 'still') {
      const png = await worker.still(dir, scratch, Number(values.at));
      await writeFile(resolve(values.out), png, { flag: 'wx' });
      return console.log(resolve(values.out));
    }
    const review = await worker.check(dir, scratch);
    if (values.json) console.log(JSON.stringify(review));
    else {
      console.log(`Checked ${review.checkedFrames} frames${review.film ? ' of ' + review.film.seconds + 's' : ''}.`);
      for (const issue of review.issues) console.log(`${issue.severity}: ${issue.text}`);
    }
    if (review.issues.some(issue => issue.severity === 'error')) process.exitCode = 1;
  } finally {
    await rm(scratch, { recursive: true, force: true, maxRetries: 4 });
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
