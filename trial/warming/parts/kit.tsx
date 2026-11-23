// The film draws in @iamsuosi/stage-light: a dark stage, one warm light on the subject, figures in the condensed face.
// This kit holds only what the film shares across scenes: their timing, the light's path, the heading and the source line.
import type {ReactNode} from 'react';
import {Easing, interpolate, useTime} from '@motionhub/runtime';
import {litStyle} from '../motions/@iamsuosi/stage-light/react/parts/light.ts';

/** Every scene's length in seconds, in order; film.tsx reads them, so the light knows where each starts. */
export const SCENES = {cover: 4, record: 11, when: 9.5, tail: 9, extremes: 10, ending: 5} as const;
type SceneId = keyof typeof SCENES;
export const START = (() => {
  let at = 0;
  const out = {} as Record<SceneId, number>;
  for (const id of Object.keys(SCENES) as SceneId[]) { out[id] = at; at += SCENES[id]; }
  return out;
})();

export const ease = Easing.inOutSine;
export const out = Easing.outQuart;
/** interpolate, always eased and clamped */
export const tween = (t: number, from: number, to: number, a: number, b: number, easing = ease) =>
  interpolate(t, [from, to], [a, b], {easing, clamp: true});

/** The frame every scene shares, in px of the 1920 × 1080 canvas; nothing is drawn below 880 (the caption's band). */
export const BOX = {
  heading: {x: 160, y: 70, w: 1600, h: 170},
  stage: {x: 160, y: 270, w: 1600, h: 560},
  source: {x: 160, y: 836, w: 1600, h: 40},
};

/** Where the light rests at each moment of the film (seconds from the film's start): x, y, radius. Moves take 1 to 1.5 s. */
const STOPS: [number, number, number, number][] = [
  // at, x, y, r
  [0, 960, 420, 760],
  [START.record + 0.2, 900, 560, 820],
  [START.record + 6.0, 1500, 420, 560],
  [START.when + 0.3, 1320, 470, 620],
  [START.tail + 0.2, 960, 560, 820],
  [START.tail + 4.4, 1180, 600, 560],
  [START.extremes + 0.2, 960, 560, 560],
  [START.extremes + 1.2, 390, 560, 520],
  [START.extremes + 2.6, 960, 560, 520],
  [START.extremes + 5.6, 1530, 560, 520],
  [START.ending + 0.2, 960, 420, 900],
];

/** The light at time t: it holds at a stop and takes 1.2 s to slide to the next */
export function lightAt(t: number) {
  let i = 0;
  while (i + 1 < STOPS.length && t >= STOPS[i + 1]![0]) i++;
  const [at, x, y, r] = STOPS[i]!;
  const prev = STOPS[Math.max(0, i - 1)]!;
  const k = i === 0 ? 1 : tween(t, at, at + 1.2, 0, 1);
  return {x: prev[1] + (x - prev[1]) * k, y: prev[2] + (y - prev[2]) * k, r: prev[3] + (r - prev[3]) * k};
}

/** A layer's contents fading in place over 0.3 s from `start` (Stage Light: things arrive by a short fade) */
export function FadeIn({start = 0, children}: {start?: number; children: ReactNode}) {
  const t = useTime();
  return <div style={{width: '100%', height: '100%', opacity: tween(t, start, start + 0.3, 0, 1)}}>{children}</div>;
}

/** The source of what the scene shows, small and grey, at the foot of the stage */
export function Source({children, lit = 1}: {children: ReactNode; lit?: number}) {
  return (
    <div style={{...litStyle(lit), fontFamily: 'var(--font-sans)', fontSize: 26, color: 'var(--color-muted)', letterSpacing: '0.02em', lineHeight: '40px'}}>
      {children}
    </div>
  );
}
