// The look: a harbour's tide chart at night. Deep sea ground #0A2233, chart ink #E6EFF1, the moon's silver
// #C9D3DA, the sun's warm #F4C05A, and one accent, buoy orange #F2763A, for the tidal bulge and the water it raises.
// Ocean water is a pale sea-green #5FB3B3. Headings in Noto Serif SC 700, labels in Noto Sans SC 400/700.
import type {ReactNode} from 'react';
import {interpolate, Easing, useLine, useTime} from '@motionhub/runtime';

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

const CAPTION = {size: 48, weight: 700, color: C.ink, background: 'rgba(6, 22, 34, 0.82)', radius: 14, padY: 14, padX: 30, bottom: 56};

/** Whether a word is Latin letters or digits, which keep a space between them; Chinese characters and punctuation do not. */
const latin = (text: string) => /^[A-Za-z0-9]/.test(text);

/**
 * The scene's caption, each word lit as it is said. Drawn here rather than by <Film captions="words">, which joins every
 * word with a space and so spaces out Chinese, where each character is a word.
 */
export function Captions({ids}: {ids: string[]}) {
  const t = useTime();
  const lines = ids.map((id) => useLine(id));
  const line = lines.find((l) => t >= l.start && t < l.end);
  if (!line) return null;
  const words = line.words ?? [];
  return (
    <div style={{height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: CAPTION.bottom, boxSizing: 'border-box'}}>
      <div style={{maxWidth: 1500, textAlign: 'center', font: `${CAPTION.weight} ${CAPTION.size}px/1.35 ${FONT.body}`, color: CAPTION.color,
        background: CAPTION.background, borderRadius: CAPTION.radius, padding: `${CAPTION.padY}px ${CAPTION.padX}px`}}>
        {words.length === 0
          ? line.text
          : words.map((w, i) => (
              <span key={i} style={{opacity: t >= w.start ? 1 : 0.35}}>
                {i > 0 && latin(words[i - 1]!.text) && latin(w.text) ? ' ' : ''}
                {w.text}
              </span>
            ))}
      </div>
    </div>
  );
}

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
