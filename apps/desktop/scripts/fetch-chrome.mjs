// Puts the headless Chrome the Studio draws its stills and exports in (ADR 0021) into resources/chrome/<build>/, for
// electron-builder to ship unpacked beside the app: the build src/main/film/chrome.ts pins, for this platform and CPU,
// checked against its digests. Run by `pnpm package`; a build already there is kept.
import { build } from 'esbuild';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const desktop = fileURLToPath(new URL('../', import.meta.url));
// Inside the package, so the bundle finds the packages it leaves out (@puppeteer/browsers) in its node_modules.
const scratch = join(desktop, 'node_modules', '.cache', 'fetch-chrome');
await mkdir(scratch, { recursive: true });
try {
  // chrome.ts, bundled for Node as the oms command bundles it (scripts/build-cli.mjs).
  const bundle = join(scratch, 'chrome.cjs');
  await build({
    entryPoints: [join(desktop, 'src/main/film/chrome.ts')],
    outfile: bundle,
    platform: 'node',
    format: 'cjs',
    bundle: true,
    external: ['@puppeteer/browsers', '@motionhub/cli', '@motionhub/cli/*', 'esbuild', 'three', 'three/*', 'electron'],
    logLevel: 'error',
    // The film format and starter film chrome.ts's imports carry, as text (as build-cli.mjs reads them).
    plugins: [{
      name: 'raw-text',
      setup(builder) {
        builder.onResolve({ filter: /\?raw$/ }, ({ path, resolveDir }) => ({ path: join(resolveDir, path) }));
        builder.onLoad({ filter: /\?raw$/ }, async ({ path }) => ({ contents: await readFile(path.replace(/\?raw$/, ''), 'utf8'), loader: 'text' }));
      },
    }],
  });
  const { fetchChromeInto } = createRequire(import.meta.url)(bundle);
  console.log(`Chrome to ship: ${await fetchChromeInto(join(desktop, 'resources', 'chrome'))}`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
