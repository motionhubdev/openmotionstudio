// The look: a lunar observer's chart on a clear night. Ground ink-blue #0B1026, chart ink #EEF1F7, the Moon's
// lit face warm silver #F4EFE1, one accent, sunlight amber #F5B041, for the Sun and whatever it lights; Earth a quiet
// sea blue. Noto Sans SC for every word (it carries Latin too), 900 for headlines, 500 for labels.
import {Easing, interpolate, useTime} from '@motionhub/runtime';
import {sans} from './fonts.tsx';

export const C = {
  ground: '#0B1026',
  glow: '#18214A',
  ink: '#EEF1F7',
  dim: '#9AA6C4',
  line: '#3A4772',
  moon: '#F4EFE1',
  moonNight: '#232C50',
  sun: '#F5B041',
  earth: '#5DA9E9',
  earthNight: '#1B3460',
  copper: '#A3542F',
};

/** The look as tokens for <MotionScope>: the caption <Film captions> draws, in the film's face, white on dark glass. */
export const TOKENS = {
  caption: {font: "'Noto Sans SC', sans-serif", size: 40, weight: 500, color: '#EEF1F7', background: 'rgba(11, 16, 38, 0.82)', radius: 12, 'padding-y': 10, 'padding-x': 28, bottom: 40},
};

/** The type scale: four sizes, weight and colour do the rest. */
export const T = {headline: 96, label: 48, note: 40, small: 40};

export const FACE = sans;

export const ease = {easing: Easing.inOutCubic, clamp: true} as const;
export const glide = {easing: Easing.outCubic, clamp: true} as const;

/** The ground: flat night with one soft radial glow and a few faint stars, the same under every scene. */
export function Ground() {
  const stars = Array.from({length: 70}, (_, i) => {
    const h = (k: number) => { const s = Math.sin((i + k) * 127.1) * 43758.5453; return s - Math.floor(s); };
    return {x: Math.round(h(1) * 1920), y: Math.round(h(2) * 1080), r: 1 + h(3) * 1.6, o: 0.15 + h(4) * 0.2};
  });
  return (
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1400px 900px at 60% 45%, ${C.glow}, ${C.ground})`}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.ink} opacity={s.o} />)}
      </svg>
    </div>
  );
}

/** The scene's headline and its quiet line, always in the same place, top left; the cover's is there from frame 0. */
export function Title({text, sub, cover = false, subAt = 0.6}: {text: string; sub?: string; cover?: boolean; subAt?: number}) {
  const t = useTime();
  const k = cover ? 1 : interpolate(t, [0, 0.5], [0, 1], glide);
  const s = cover ? 1 : interpolate(t, [subAt, subAt + 0.6], [0, 1], glide);
  return (
    <div style={{position: 'absolute', left: 100, top: 64, fontFamily: FACE, opacity: k, transform: `translateY(${Math.round((1 - k) * 16)}px)`}}>
      <div style={{fontSize: T.headline, fontWeight: 900, lineHeight: 1.1, color: C.ink}}>{text}</div>
      {sub && <div style={{fontSize: T.note, fontWeight: 500, color: C.dim, marginTop: 10, opacity: s}}>{sub}</div>}
    </div>
  );
}
