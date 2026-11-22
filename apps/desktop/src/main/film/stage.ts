import { BrowserWindow, app, nativeImage, type Session, type NativeImage } from 'electron';
import { seekScript, type Box, type FilmInfo } from '../../shared/preview';
import { keepFilmsInPlace, PREVIEW_URL } from './preview';

const FRAME_MS = 60_000;

/**
 * Lets Chromium draw WebGL with SwiftShader, its software renderer, where no GPU can: a virtual machine, CI, a remote
 * desktop. Chromium no longer falls back to it by itself, so a three.js film there fails to start. "Unsafe" because
 * SwiftShader compiles shaders in a less hardened process; a film reaches it only from its sandboxed frame (ADR 0004),
 * and only on a machine without a usable GPU. Must run before the app is ready.
 */
export function allowSoftwareWebGL(): void {
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}

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
  /** The frame at `t` as the PNG DevTools made of it, for an export: not decoded and encoded again. */
  png(t: number): Promise<Buffer>;
  close(): void;
}

/** A PNG's width and height, from its header. */
const pngSize = (png: Buffer): { width: number; height: number } => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

/**
 * What a review or an export needs of a stage: the film, its frames as PNGs, and closing it. The oms command's Chrome
 * stage (apps/cli/chrome.ts) is one too.
 */
export type PhotoStage = Pick<Stage, 'film' | 'png'> & { close(): void | Promise<void> };

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
  // Frames are taken through DevTools' screenshot, which waits for a frame drawn from the page as it is now.
  // capturePage returns the window's last painted frame, which lags a seek while a heavy frame is still being
  // rasterized, and fails with UnknownVizError while the window is first resized to the film.
  contents.debugger.attach('1.3');
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
    // The frame at `t` as DevTools draws it, with a box outlined in red where the person marked it.
    const shoot = async (t: number, box?: Box): Promise<Buffer> => {
      const error = (await timeout(contents.executeJavaScript(seekScript(t)), `The frame at ${t.toFixed(2)} s`)) as string | null;
      if (error) throw new Error(error);
      if (box) {
        await contents.executeJavaScript(`window.__omsMark?.(${JSON.stringify(box)})`);
        await contents.executeJavaScript('new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))');
      }
      const shot = (await timeout(
        contents.debugger.sendCommand('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true }),
        `Photographing the frame at ${t.toFixed(2)} s`,
      )) as { data: string };
      if (box) await contents.executeJavaScript('window.__omsMark?.(null)');
      return Buffer.from(shot.data, 'base64');
    };
    // A screen with more device pixels than CSS pixels gives a larger frame, brought to the film's size.
    const toFilm = (image: NativeImage) => {
      const size = image.getSize();
      return size.width === film.width && size.height === film.height ? image : image.resize({ width: film.width, height: film.height });
    };
    return {
      film,
      frame: async (t, box) => toFilm(nativeImage.createFromBuffer(await shoot(t, box))),
      async png(t) {
        const png = await shoot(t);
        const size = pngSize(png);
        return size.width === film.width && size.height === film.height ? png : toFilm(nativeImage.createFromBuffer(png)).toPNG();
      },
      close: () => { if (!window.isDestroyed()) window.destroy(); },
    };
  } catch (error) {
    if (!window.isDestroyed()) window.destroy();
    throw error;
  }
}
