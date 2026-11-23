#!/usr/bin/env node
import { constants, existsSync } from 'node:fs';
import { cp, copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = dirname(fileURLToPath(import.meta.url));
const usage = 'oms install <claude|codex> | init <folder> | check <folder> [--json] | still <folder> --at <seconds> --out <new.png> | render <folder> --out <new.mp4> | player <folder> --out <new folder> | preview <folder> [--port <n>] | motion search <words…> [--json] | motion use <@scope/slug> <folder> | sound <folder> --cues <at:role,…> --seconds <s> --out <new.wav> [--motion <id>]';

/** `oms motion search <words…> [--json]` and `oms motion use <@scope/slug> <folder>`: motions from motionhub, on demand. */
async function motion(args) {
  const { values, positionals } = parseArgs({ args, options: { json: { type: 'boolean' } }, allowPositionals: true });
  const [action, ...rest] = positionals;
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  if (action === 'search') {
    const found = await worker.searchMotions(rest.join(' '));
    if (values.json) return console.log(JSON.stringify(found));
    if (!found.length) return console.log('No motion has all of those words.');
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

async function run() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') return console.log(usage);
  if (command === 'motion') return motion(args);
  if (command === 'sound') return sound(args);
  const options = command === 'still' ? { at: { type: 'string' }, out: { type: 'string' } }
    : command === 'render' || command === 'player' ? { out: { type: 'string' } }
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
      await cp(join(root, 'skills/oms'), dest, { recursive: true });
      await copyFile(join(root, 'dist/film-format.md'), join(dest, 'film-format.md'));
      await cp(join(root, 'dist/example'), join(dest, 'example'), { recursive: true });
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
    return console.log(dir);
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
