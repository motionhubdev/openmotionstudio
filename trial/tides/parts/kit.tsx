// The look: a harbour's tide chart at night. Deep sea ground #0A2233, chart ink #E6EFF1, the moon's silver
// #C9D3DA, the sun's warm #F4C05A, and one accent, buoy orange #F2763A, for the tidal bulge and the water it raises.
// Ocean water is a pale sea-green #5FB3B3. Headings in Noto Serif SC 700, labels in Noto Sans SC 400/700.
import type {ReactNode} from 'react';
import {interpolate, Easing, useTime} from '@motionhub/runtime';

export const C = {
  ground: '#0A2233',
  deep: '#0E2C42',
  panel: '#12344C',
  ink: '#E6EFF1',
  dim: '#7E98A6',
  moon: '#C9D3DA',
  sun: '#F4C05A',
  accent: '#F2763A',
  water: '#5FB3B3',
  land: '#3E5F4A',
};

export const FONT = {
  head: "'Noto Serif SC', serif",
  body: "'Noto Sans SC', sans-serif",
};

/** The type scale: four sizes. */
export const T = {
  cover: 132,
  head: 84,
  label: 48,
  small: 40,
};

/** Caption tokens for <MotionScope>, in the film's face and colours. */
export const captionTokens = {
  caption: {
    font: FONT.body,
    size: 44,
    weight: 700,
    color: C.ink,
    background: 'rgba(6, 22, 34, 0.82)',
    radius: 14,
    'padding-y': 14,
    'padding-x': 30,
    bottom: 56,
  },
};

/** The heading every scene keeps in the same box; it rises in over half a second. */
export function Heading({children, cover = false}: {children: ReactNode; cover?: boolean}) {
  const now = useTime();
  const t = cover ? 1 : now;
  const y = interpolate(t, [0, 0.5], [18, 0], {easing: Easing.outCubic, clamp: true});
  const opacity = interpolate(t, [0, 0.4], [0, 1], {easing: Easing.outCubic, clamp: true});
  return (
    <div style={{height: '100%', display: 'flex', alignItems: 'center', font: `700 ${T.head}px/1.1 ${FONT.head}`, color: C.ink,
      opacity, transform: `translateY(${Math.round(y)}px)`}}>
      {children}
    </div>
  );
}

/** Fades a scene's layer in over its first half second. */
export function useEnter(): number {
  const t = useTime();
  return interpolate(t, [0, 0.5], [0, 1], {easing: Easing.outCubic, clamp: true});
}

/** A 0–1 ramp between two times, eased and clamped. */
export function ramp(t: number, a: number, b: number, easing = Easing.inOutCubic): number {
  return interpolate(t, [a, b], [0, 1], {easing, clamp: true});
}
