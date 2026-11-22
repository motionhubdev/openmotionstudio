#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { cp, copyFile, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
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
    await mkdir(dest);
    try {
      await cp(join(root, 'dist/skill'), dest, { recursive: true });
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
  const require = createRequire(import.meta.url);
  const electronDir = dirname(require.resolve('electron/package.json'));
  // Keep download progress off stdout so the very first --json invocation is parseable.
  if (!process.env.ELECTRON_OVERRIDE_DIST_PATH && !existsSync(join(electronDir, 'path.txt'))) {
    execFileSync(process.execPath, [join(electronDir, 'install.js')], { stdio: ['ignore', 2, 2] });
  }
  const electron = require('electron');
  const scratch = await mkdtemp(join(tmpdir(), 'oms-preview-'));
  try {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const status = await new Promise((done, fail) => {
      const child = spawn(electron, [join(root, 'dist/worker.cjs'), command, dir, scratch, values.at ?? '0'],
        { stdio: ['ignore', 'inherit', 'inherit'], env });
      child.on('error', fail);
      child.on('exit', (code, signal) => signal ? fail(new Error('Player exited with ' + signal)) : done(code));
    });
    if (status !== 0) throw new Error('The preview player failed. See the diagnostic above.');
    if (command === 'still') {
      await copyFile(join(scratch, 'frame.png'), resolve(values.out), constants.COPYFILE_EXCL);
      return console.log(resolve(values.out));
    }
    const review = JSON.parse(await readFile(join(scratch, 'review.json'), 'utf8'));
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
