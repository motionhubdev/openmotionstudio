import { BrowserWindow, type Session, type NativeImage } from 'electron';
import type { Box, FilmInfo } from '../../shared/preview';
import { keepFilmsInPlace, PREVIEW_URL } from './preview';

const FRAME_MS = 60_000;

function timeout<T>(promise: Promise<T>, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_, fail) => {
      timer = setTimeout(() => fail(new Error(`${what} took longer than ${FRAME_MS / 1000} s.`)), FRAME_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** A film opened still, ready to be photographed at any time; close() when done. */
export interface Stage {
  film: FilmInfo;
  /** The frame at `t`; with a box, outlined in red where the person marked it. */
  frame(t: number, box?: Box): Promise<NativeImage>;
  close(): void;
}

/** Opens the film of build `version` for photographing. Rejects with the page's own error when it fails. */
export async function openStage(version: number, session: Session): Promise<Stage> {
  const window = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    webPreferences: { offscreen: true, session, sandbox: true, contextIsolation: true },
  });
  const contents = window.webContents;
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  keepFilmsInPlace(contents);
  const failed = async (): Promise<string | null> => (await contents.executeJavaScript('window.__omsError ?? null')) as string | null;
  try {
    await timeout(contents.loadURL(`${PREVIEW_URL}?render=1&v=${version}`), 'Loading the film');
    const film = await timeout(
      (async () => {
        for (;;) {
          const error = await failed();
          if (error) throw new Error(error);
          const info = (await contents.executeJavaScript(
            // All the film is, but its seek, which is no data.
            'window.__oms ? (({seek, ...film}) => film)(window.__oms) : null',
          )) as FilmInfo | null;
          if (info) return info;
          await new Promise((done) => setTimeout(done, 50));
        }
      })(),
      'Starting the film',
    );
    window.setContentSize(film.width, film.height);
    await contents.executeJavaScript('document.fonts.ready.then(() => true)');
    return {
      film,
      async frame(t, box) {
        await timeout(contents.executeJavaScript(`window.__oms.seek(${Number(t)})`), `The frame at ${t.toFixed(2)} s`);
        await timeout(
          contents.executeJavaScript('Promise.all([...document.images].map(image => image.decode()).concat(document.fonts.ready)).then(() => true)'),
          'Loading image assets and faces',
        );
        const error = await failed();
        if (error) throw new Error(error);
        if (box) {
          await contents.executeJavaScript(`window.__omsMark?.(${JSON.stringify(box)})`);
          await contents.executeJavaScript('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))');
        }
        const image = await contents.capturePage();
        if (box) await contents.executeJavaScript('window.__omsMark?.(null)');
        const size = image.getSize();
        return size.width === film.width && size.height === film.height ? image : image.resize({ width: film.width, height: film.height });
      },
      close: () => { if (!window.isDestroyed()) window.destroy(); },
    };
  } catch (error) {
    if (!window.isDestroyed()) window.destroy();
    throw error;
  }
}
