// Produce the small, self-contained CLI archive copied by standard skill installers.
// Keep the example and the skill installer payload in the full CLI distribution.
import '../../desktop/scripts/build-cli.mjs';
import { execSync } from 'node:child_process';
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../', import.meta.url));
const skill = join(cli, '../../skills/oms');
const manifest = JSON.parse(await readFile(join(cli, 'package.json'), 'utf8'));
const stage = await mkdtemp(join(tmpdir(), 'oms-skill-pack-'));
try {
  const { version, license, engines, bin, dependencies } = manifest;
  await writeFile(join(stage, 'package.json'), JSON.stringify({
    name: 'oms-skill-runtime', private: true, version, license, engines, bin, dependencies,
  }, null, 2));
  await copyFile(join(cli, 'oms.mjs'), join(stage, 'oms.mjs'));
  for (const resource of ['LICENSE', 'starter.tsx', 'worker.cjs', 'resources'])
    await cp(join(cli, 'dist', resource), join(stage, 'dist', resource), { recursive: true });
  const name = execSync('npm pack --quiet --ignore-scripts', { cwd: stage, encoding: 'utf8' }).trim();
  await mkdir(join(skill, 'assets'), { recursive: true });
  await copyFile(join(stage, name), join(skill, 'assets/oms-cli.tgz'));
  const guide = await readFile(join(cli, '../desktop/src/main/film/film.md'), 'utf8');
  await writeFile(join(skill, 'film-format.md'), guide.slice(guide.indexOf('# The film'), guide.indexOf('# How you work')).trimEnd() + '\n');
} finally {
  await rm(stage, { recursive: true, force: true });
}
