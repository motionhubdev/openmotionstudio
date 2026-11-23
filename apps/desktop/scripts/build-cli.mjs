// Package the same player, starter and build/review implementation as this Studio.
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const desktop = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../../cli/', import.meta.url));
const dist = join(cli, 'dist');
const require = createRequire(import.meta.url);
const expected = require('../package.json').devDependencies['@motionhub/runtime'];
if (require('@motionhub/runtime/package.json').version !== expected)
  throw new Error(`Install the locked MotionHub runtime ${expected} before packing the CLI.`);
await import('./build-preview.mjs');
// A pack holds this build alone: nothing left from an earlier one is published.
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await build({
  entryPoints: [join(cli, 'worker.ts')],
  outfile: join(dist, 'worker.cjs'),
  platform: 'node',
  format: 'cjs',
  bundle: true,
  // Packages the oms package installs stay outside; @motionhub/runtime's synth (sound effects) is bundled, the copy the
  // Studio's preview core holds too.
  external: ['@puppeteer/browsers', '@motionhub/cli', '@motionhub/cli/*', 'esbuild', 'three', 'three/*'],
  plugins: [{
    name: 'raw-text',
    setup(builder) {
      builder.onLoad({ filter: /\.(md|txt)\?raw$/ }, async ({ path }) => ({
        contents: await readFile(path.replace(/\?raw$/, ''), 'utf8'), loader: 'text',
      }));
      builder.onResolve({ filter: /\?raw$/ }, ({ path, resolveDir }) => ({ path: join(resolveDir, path) }));
    },
  }],
});
// The web player's page script (apps/cli/player.ts), for the browsers it plays in.
await build({ entryPoints: [join(cli, 'player.ts')], outfile: join(dist, 'player.js'), platform: 'browser', format: 'iife', bundle: true, minify: true, target: 'es2020' });
await cp(join(desktop, 'resources/preview/core.js'), join(dist, 'resources/preview/core.js'));
await cp(join(desktop, 'resources/preview/pick.js'), join(dist, 'resources/preview/pick.js'));
await cp(join(desktop, 'src/main/film/starter.tsx.txt'), join(dist, 'starter.tsx'));
const guide = await readFile(join(desktop, 'src/main/film/film.md'), 'utf8');
// The film format as the Studio's agent has it; the skill says which oms command stands for each of its tools.
await writeFile(join(dist, 'film-format.md'), guide.slice(guide.indexOf('# The film'), guide.indexOf('# How you work')));
await cp(join(desktop, '../../LICENSE'), join(dist, 'LICENSE'));
await cp(join(cli, 'OFL.txt'), join(dist, 'OFL.txt'));

// The example is apps/cli/example as it is: one film.tsx, drawn from code.
await cp(join(cli, 'example'), join(dist, 'example'), { recursive: true });
