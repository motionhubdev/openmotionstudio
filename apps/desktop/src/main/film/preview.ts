// The oms-preview: scheme, which serves the open film's preview page, the Studio's preview
// scripts, the film's bundle with its assets, and the project's own files. It is what a
// film's code runs under, so its policy lets the page load only from this scheme and reach
// nothing else (ADR 0004).
//
//   oms-preview://film/                  the page (?render=1 for stills and export, ?v= the build)
//   oms-preview://film/studio/<file>     the Studio's preview scripts (resources/preview/: core.js, pick.js)
//   oms-preview://film/build/<file>      the film's bundle and assets, and its motions' faces (fonts.css), from <project>/.motion-studio/build/
//   oms-preview://film/project/<file>    the project's own files (a motion's poster, previews and faces)

import { app, protocol, type Session, type WebContents } from 'electron';
import { join } from 'node:path';
import { catalogueResource } from '../motions';
import { buildDir } from './film';
import { filmFile, filmPolicy } from './serve';

export const SCHEME = 'oms-preview';
export const PREVIEW_URL = `${SCHEME}://film/`;

const FILM_ORIGIN = `${SCHEME}://film`;

const onFilm = (url: string | undefined) => {
  try {
    if (url === undefined) return false;
    // by protocol and host: URL gives a scheme it does not know the origin 'null'
    const { protocol, host } = new URL(url);
    return protocol === `${SCHEME}:` && host === 'film';
  } catch {
    return false;
  }
};

/** Whether a frame on `from`, or started by a frame on `by`, may go to `to`: a film never leaves its own host. */
export function filmMayNavigate(to: string, from?: string, by?: string): boolean {
  return onFilm(to) || (!onFilm(from) && !onFilm(by));
}

/** Holds every film frame in `contents` to its own host, which the policy alone cannot: it does not cover navigation. */
export function keepFilmsInPlace(contents: WebContents): void {
  contents.on('will-frame-navigate', (event) => {
    if (!filmMayNavigate(event.url, event.frame?.url, event.initiator?.url)) event.preventDefault();
  });
}

/** Must run before the app is ready. */
export function registerPreviewScheme(): void {
  // CORS-enabled: a font or a fetched file is a CORS request, and a sandboxed frame's origin is null.
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, corsEnabled: true, supportFetchAPI: true } },
  ]);
}

/** Where the Studio's preview scripts are built to (scripts/build-preview.mjs). */
export const studioScripts = (): string => join(app.getAppPath(), 'resources', 'preview');

const CATALOGUE_POLICY = `default-src 'none'; script-src ${SCHEME}://catalogue; style-src ${SCHEME}://catalogue 'unsafe-inline'; img-src ${SCHEME}://catalogue data: blob:; font-src ${SCHEME}://catalogue data:; media-src ${SCHEME}://catalogue; connect-src ${SCHEME}://catalogue`;

function respond(body: string | Buffer, type: string, policy = filmPolicy(FILM_ORIGIN)): Response {
  return new Response(body, {
    headers: {
      'content-type': type,
      'content-security-policy': policy,
      'cache-control': 'no-store',
      // The only page that can ask is the film's own, from this scheme: the scheme serves nothing private to it.
      'access-control-allow-origin': '*',
    },
  });
}

/** Serves the film in the folder `film()` names (none while no film is open) on `session`'s oms-preview: scheme. */
export function servePreview(session: Session, film: () => string | null, output?: string): void {
  session.protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);
    const dir = film();
    if (!dir) return new Response('Not found', { status: 404 });
    if (url.host === 'catalogue') {
      try {
        const resource = await catalogueResource(dir, url.pathname);
        return respond(resource.body, resource.type, CATALOGUE_POLICY);
      } catch {
        return new Response('The catalogue player could not be loaded.', { status: 502 });
      }
    }
    if (url.host !== 'film') return new Response('Not found', { status: 404 });
    const found = await filmFile(dir, output ?? buildDir(dir), studioScripts(), url.pathname);
    if (found) return respond(found.body, found.type);
    return new Response('Not found', { status: 404 });
  });
}
