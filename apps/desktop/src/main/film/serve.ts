// What the film's page is served from, with nothing of Electron's: the page, the Studio's preview scripts, the film's
// bundle and the project's own files, each kept to its root. The Studio serves them on its oms-preview: scheme
// (preview.ts) and the oms command to its headless Chrome (apps/cli), so a film runs on the same files and the same
// policy in both (ADR 0004).

import { readFile, realpath } from 'node:fs/promises';
import { extname, join, normalize, relative, sep } from 'node:path';
import { STATE_DIR } from '../project';

/**
 * The policy a film's page runs under on `origin`: it loads and reaches nothing beyond that host. Only the film's own
 * host: in the Studio, the catalogue host on the same scheme is fetched from the network by the main process, so a film
 * that could reach it could send what it reads from the project out in a URL (ADR 0004).
 */
export const filmPolicy = (origin: string): string => [
  "default-src 'none'",
  // Scripts come only from the film's host: the page carries none inline (the Studio's own
  // calls into a render page go through executeJavaScript, which the policy does not see).
  `script-src ${origin}`,
  `style-src ${origin} 'unsafe-inline'`,
  `img-src ${origin} data: blob:`,
  `font-src ${origin} data:`,
  `media-src ${origin} data: blob:`,
  // A film may fetch its own files; nothing beyond its host.
  `connect-src ${origin}`,
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/** The preview page: the core holds React and the runtime and loads the film's bundle itself; pick.js answers pointing. */
export const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>Preview</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}</style>
</head><body><div id="root"></div><script src="studio/core.js"></script><script src="studio/pick.js"></script></body></html>`;

export const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  // A screen recording from macOS: Chromium plays its H.264 when told it is MP4, and refuses video/quicktime in a data: URL.
  '.mov': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
};

/** A path under `root` for a URL path, or null when it would leave it. */
export function within(root: string, urlPath: string): string | null {
  const relative = normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
  if (relative === '' || relative.split(/[/\\]/).includes('..')) return null;
  const path = join(root, relative);
  return path.startsWith(root + sep) ? path : null;
}

/** A preview can never read project state, Git metadata, or a symlink outside its root. */
export async function safePreviewFile(root: string, urlPath: string, project = false): Promise<string | null> {
  const file = within(root, urlPath);
  if (!file) return null;
  const actualRoot = await realpath(root);
  const actual = await realpath(file);
  const path = relative(actualRoot, actual);
  if (path === '..' || path.startsWith(`..${sep}`) || !actual.startsWith(actualRoot + sep)) return null;
  // lower-cased: macOS and Windows file systems ignore case, so .GIT is .git there
  const hidden = (value: string) =>
    value
      .toLowerCase()
      .split(/[/\\]/)
      .some((part) => part === '.motion-studio' || part === '.git' || part === 'node_modules');
  if (project && (hidden(path) || hidden(decodeURIComponent(urlPath)))) return null;
  return actual;
}

/**
 * The file a film's page asks for at `pathname` (`/`, `/studio/…`, `/build/…`, `/reels/…`, `/project/…`), from the
 * folder `dir`, its bundle in `output` and the Studio's preview scripts in `studio`; null when it is none of them.
 */
export async function filmFile(dir: string, output: string, studio: string, pathname: string): Promise<{ body: string | Buffer; type: string } | null> {
  if (pathname === '/' || pathname === '/index.html') return { body: PAGE, type: 'text/html' };
  const roots = [
    ['/studio/', studio],
    ['/build/', output],
    ['/reels/', join(dir, STATE_DIR, 'reels')],
    ['/project/', dir],
  ] as const;
  try {
    for (const [prefix, root] of roots) {
      if (!pathname.startsWith(prefix)) continue;
      const file = await safePreviewFile(root, pathname.slice(prefix.length), prefix === '/project/');
      if (file) return { body: await readFile(file), type: TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return null;
}
