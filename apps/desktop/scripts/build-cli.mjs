// Package the same player, starter and build/review implementation as this Studio.
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
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
await mkdir(dist, { recursive: true });
await build({
  entryPoints: [join(cli, 'worker.ts')],
  outfile: join(dist, 'worker.cjs'),
  platform: 'node',
  format: 'cjs',
  bundle: true,
  packages: 'external',
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
await cp(join(desktop, 'resources/preview/core.js'), join(dist, 'resources/preview/core.js'));
await cp(join(desktop, 'resources/preview/pick.js'), join(dist, 'resources/preview/pick.js'));
await cp(join(desktop, 'src/main/film/starter.tsx.txt'), join(dist, 'starter.tsx'));
const guide = await readFile(join(desktop, 'src/main/film/film.md'), 'utf8');
await writeFile(join(dist, 'film-format.md'), guide.slice(guide.indexOf('# The film'), guide.indexOf('# How you work')));
await cp(join(desktop, '../../LICENSE'), join(dist, 'LICENSE'));

// The example is apps/cli/example as it is, with the Studio's own face beside its media.
const example = join(dist, 'example');
await cp(join(cli, 'example'), example, { recursive: true });
for (const asset of ['Inter.woff2', 'Inter-OFL.txt'])
  await cp(join(desktop, 'resources/fonts', asset), join(example, 'media', asset));
