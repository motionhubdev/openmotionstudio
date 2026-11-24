import { app, nativeImage, type NativeImage } from 'electron';
import type { Box, FilmInfo, Inspection } from '../../shared/preview';
import type { ChromeStage } from './chrome';

/**
 * Lets the Studio's own preview draw WebGL with SwiftShader, Chromium's software renderer, where no GPU can: a virtual
 * machine, CI, a remote desktop (its stills and exports are drawn in headless Chrome, chrome.ts, which does the same).
 * Chromium no longer falls back to it by itself, so a three.js film there fails to start. "Unsafe" because
 * SwiftShader compiles shaders in a less hardened process; a film reaches it only from its sandboxed frame (ADR 0004),
 * and only on a machine without a usable GPU. Must run before the app is ready.
 */
export function allowSoftwareWebGL(): void {
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
}

/** A film opened still, ready to be photographed at any time; close() when done. */
export interface Stage {
  film: FilmInfo;
  /** The frame at `t`; with a box, outlined in red where the person marked it. */
  frame(t: number, box?: Box): Promise<NativeImage>;
  /** The frame at `t` as the PNG DevTools made of it, for an export: not decoded and encoded again. */
  png(t: number): Promise<Buffer>;
  /** What the frame last drawn shows that its picture does not say (shared/preview.ts, Inspection). */
  inspect(): Promise<Inspection>;
  close(): void;
}

/**
 * What a review or an export needs of a stage: the film, its frames as PNGs, and closing it: a headless Chrome's
 * (chrome.ts), in the Studio and in oms alike.
 */
export type PhotoStage = Pick<Stage, 'film' | 'png' | 'inspect'> & { close(): void | Promise<void> };

/** The Studio's stage: Chrome's (ADR 0021), its frames also decoded, a marked box outlined. */
export function studioStage(stage: ChromeStage): Stage {
  return {
    film: stage.film,
    png: (t) => stage.png(t),
    frame: async (t, box) => nativeImage.createFromBuffer(await stage.png(t, box)),
    inspect: () => stage.inspect(),
    close: () => void stage.close(),
  };
}
