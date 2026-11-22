#!/usr/bin/env node
import { constants } from 'node:fs';
import { cp, copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = dirname(fileURLToPath(import.meta.url));
const usage = 'oms install <claude|codex> | init <folder> | check <folder> [--json] | still <folder> --at <seconds> --out <new.png>';

async function run() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help') return console.log(usage);
  const options = command === 'still' ? { at: { type: 'string' }, out: { type: 'string' } }
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
  if (!['still', 'check'].includes(command)) throw new Error(usage);
  if (command === 'still' && (!values.at?.trim() || !Number.isFinite(Number(values.at)) || !values.out?.toLowerCase().endsWith('.png'))) throw new Error(usage);
  // The worker builds the film with the Studio's own code and draws it in headless Chrome (worker.ts, chrome.ts).
  const worker = createRequire(import.meta.url)(join(root, 'dist/worker.cjs'));
  const scratch = await mkdtemp(join(tmpdir(), 'oms-preview-'));
  try {
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
