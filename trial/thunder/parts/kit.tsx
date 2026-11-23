// The look: a summer thunderstorm over open fields at night, seen from a porch. Ground storm-indigo #121829,
// clouds slate #2A3354, ink #EEF1F7; lightning is the one yellow #FFD84A (light, always), thunder the one coral
// #FF8A5C (sound, always). Noto Sans SC at 900 for headings and figures, 400 for labels.
import type {ReactNode} from 'react';
import {interpolate, Easing, useTime, useLine} from '@motionhub/runtime';
import notoSans400 from '../media/fonts/noto-sans-sc-400.ttf';
import notoSans900 from '../media/fonts/noto-sans-sc-900.ttf';

export const C = {
  ground: '#121829',
  panel: '#1B2440',
  cloud: '#2A3354',
  cloudLit: '#3A4670',
  ink: '#EEF1F7',
  dim: '#8A94AD',
  rule: '#3A4466',
  light: '#FFD84A',
  sound: '#FF8A5C',
};

export const FACE = "'Noto Sans SC', sans-serif";

/** The type scale: five sizes. */
export const T = {
  hero: {font: `900 132px/1.1 ${FACE}`, letterSpacing: '0.02em'},
  head: {font: `900 92px/1.15 ${FACE}`},
  figure: {font: `900 84px/1 ${FACE}`},
  body: {font: `400 52px/1.3 ${FACE}`},
  label: {font: `400 42px/1.3 ${FACE}`},
};

export const fontFaces = `
@font-face { font-family: 'Noto Sans SC'; font-weight: 400; src: url(${notoSans400}); }
@font-face { font-family: 'Noto Sans SC'; font-weight: 900; src: url(${notoSans900}); }
`;

/** The caption: the film's face on a storm-indigo bar at the foot of the frame. */
export const captionTokens = {
  caption: {
    font: FACE,
    size: 50,
    weight: 400,
    color: C.ink,
    background: 'rgba(12, 16, 30, 0.78)',
    radius: 16,
    'padding-y': 14,
    'padding-x': 32,
    bottom: 48,
  },
};

/** When the `nth` word of a line holding `ch` is said, in its scene's time (the line's start when it has no words yet). */
export function useSaid(line: string, ch: string, nth = 0) {
  const l = useLine(line);
  const hits = (l?.words ?? []).filter((w) => w.text.includes(ch));
  return hits[nth]?.start ?? l?.start ?? 0;
}

/** A 0→1 entrance over half a second from `at`, eased. */
export function useIn(at = 0, len = 0.5) {
  const t = useTime();
  return interpolate(t, [at, at + len], [0, 1], {easing: Easing.outCubic, clamp: true});
}

/** A 1→0 exit over `len` seconds from `at`. */
export function useOut(at: number, len = 0.4) {
  const t = useTime();
  return interpolate(t, [at, at + len], [1, 0], {easing: Easing.inOutCubic, clamp: true});
}

/** The shared frame: every scene's heading sits in the same place, rising in over its first half second. */
export function Heading({children, cover = false}: {children: ReactNode; cover?: boolean}) {
  const p = useIn(0, 0.5);
  const k = cover ? 1 : p;
  return (
    <div style={{...T.head, color: C.ink, opacity: k, transform: `translateY(${Math.round((1 - k) * 24)}px)`}}>
      {children}
    </div>
  );
}

/** A zig-zag lightning bolt as one filled shape, from (0,0) down to about (40, h). */
export function boltPath(h: number) {
  const s = h / 300;
  const pts = [
    [10, 0], [46, 0], [30, 110], [62, 110], [6, 300], [22, 160], [-8, 160],
  ].map(([x, y]) => `${Math.round(x! * s)},${Math.round(y! * s)}`);
  return `M${pts.join(' L')} Z`;
}

/** A storm cloud as a cluster of round lobes on a flat base, drawn in its own box. */
export function Cloud({w, lit = 0}: {w: number; lit?: number}) {
  const h = Math.round(w * 0.42);
  const lobes = [
    [0.22, 0.62, 0.2], [0.42, 0.42, 0.26], [0.64, 0.5, 0.22], [0.82, 0.66, 0.16], [0.1, 0.78, 0.12],
  ];
  const fill = lit > 0 ? mix(C.cloud, C.cloudLit, lit) : C.cloud;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{display: 'block', overflow: 'visible'}}>
      {lobes.map(([cx, cy, r], i) => (
        <circle key={i} cx={Math.round(cx! * w)} cy={Math.round(cy! * h)} r={Math.round(r! * w)} fill={fill} />
      ))}
      <rect x={Math.round(0.06 * w)} y={Math.round(0.66 * h)} width={Math.round(0.86 * w)} height={Math.round(0.3 * h)} rx={Math.round(0.15 * h)} fill={fill} />
    </svg>
  );
}

/** Mixes two #RRGGBB colours. */
export function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i]! - v) * k)).join(',')})`;
}
