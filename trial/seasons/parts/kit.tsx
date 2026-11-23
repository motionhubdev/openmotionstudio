// The look: a school atlas's wall chart of the sky. Warm chart paper #F2EBDD for the ground, navy ink #1D2B3E for
// lines and words, the sun's gold #E9A23B as the one accent for sunlight, and two meanings that never change: warm
// #D8613C is summer and heat, cold #3F7DB4 is winter and cold. Noto Sans SC (SIL OFL 1.1, from @fontsource/noto-sans-sc
// 5.3.1, cut down to the characters this film writes) at 700 for headings and 400 for labels.
import type {ReactNode} from 'react';
import {interpolate, Easing, useTime} from '@motionhub/runtime';
import regular from '../media/fonts/noto-sans-sc-400.woff2';
import bold from '../media/fonts/noto-sans-sc-700.woff2';

export const C = {
  paper: '#F2EBDD',
  panel: '#E8DFCC',
  ink: '#1D2B3E',
  dim: '#8C8F8E',
  faint: '#CFC5B1',
  sun: '#E9A23B',
  sunGlow: '#F6D38C',
  warm: '#D8613C',
  cold: '#3F7DB4',
  sea: '#5D8FB8',
  land: '#7FA66A',
};

export const FACE = "'Noto Sans SC', sans-serif";

/** Four sizes: the cover's title, a heading, a label, a small note. */
export const T = {cover: 132, heading: 88, label: 44, note: 40};

export const FONTS = `
@font-face { font-family: 'Noto Sans SC'; font-weight: 400; src: url(${regular}) format('woff2'); }
@font-face { font-family: 'Noto Sans SC'; font-weight: 700; src: url(${bold}) format('woff2'); }
`;

/** The caption: ink on a paper-coloured band, in the film's face. */
export const captionTokens = {
  caption: {
    font: FACE,
    size: '46px',
    weight: '400',
    color: C.paper,
    background: 'rgba(29, 43, 62, 0.88)',
    radius: '14px',
    'padding-y': 14,
    'padding-x': 32,
    bottom: '48px',
  },
};

/** The same boxes in every scene: the heading at the top, the stage under it, clear of the caption. */
export const BOX = {
  heading: {x: 120, y: 64, w: 1680, h: 130},
  stage: {x: 120, y: 214, w: 1680, h: 666},
};

/** Fades and rises in over the first half second of its scene. */
export function Enter({children, delay = 0, rise = 18}: {children: ReactNode; delay?: number; rise?: number}) {
  const t = useTime();
  const p = interpolate(t, [delay, delay + 0.5], [0, 1], {easing: Easing.outCubic, clamp: true});
  return <div style={{width: '100%', height: '100%', opacity: p, transform: `translateY(${Math.round((1 - p) * rise)}px)`}}>{children}</div>;
}

/** A scene's heading, in the heading box. */
export function Heading({children, size = T.heading}: {children: ReactNode; size?: number}) {
  return (
    <Enter>
      <div style={{height: '100%', display: 'flex', alignItems: 'center', font: `700 ${size}px/1.1 ${FACE}`, color: C.ink, letterSpacing: '0.02em'}}>
        {children}
      </div>
    </Enter>
  );
}

/** 0→1 over [a, b], eased and clamped. */
export function ramp(t: number, a: number, b: number, easing = Easing.inOutCubic) {
  return interpolate(t, [a, b], [0, 1], {easing, clamp: true});
}

/** A sun: a gold disc in a soft glow. */
export function Sun({cx, cy, r, glow = 1}: {cx: number; cy: number; r: number; glow?: number}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.9} fill={C.sunGlow} opacity={0.35 * glow} />
      <circle cx={cx} cy={cy} r={r * 1.4} fill={C.sunGlow} opacity={0.5 * glow} />
      <circle cx={cx} cy={cy} r={r} fill={C.sun} />
    </g>
  );
}

/**
 * The Earth seen side on: a sea-blue disc, its axis tilted `tilt` degrees (positive leans the north pole right),
 * the northern half tinted `north` and the southern `south` when given, the equator a line across it.
 */
export function Earth({cx, cy, r, tilt = 0, north, south, northOpacity = 0, southOpacity = 0, axis = 1.45}: {
  cx: number; cy: number; r: number; tilt?: number; north?: string; south?: string; northOpacity?: number; southOpacity?: number; axis?: number;
}) {
  const id = `earth-${Math.round(cx)}-${Math.round(cy)}-${Math.round(r)}`;
  return (
    <g transform={`translate(${Math.round(cx)} ${Math.round(cy)}) rotate(${tilt})`}>
      <defs>
        <clipPath id={id}><circle r={r} /></clipPath>
      </defs>
      <circle r={r} fill={C.sea} />
      <g clipPath={`url(#${id})`}>
        <path d={`M ${-r * 0.55} ${-r * 0.55} q ${r * 0.35} ${-r * 0.25} ${r * 0.7} ${-r * 0.05} q ${r * 0.1} ${r * 0.35} ${-r * 0.2} ${r * 0.5} q ${-r * 0.4} ${r * 0.05} ${-r * 0.5} ${-r * 0.45} z`} fill={C.land} />
        <path d={`M ${r * 0.15} ${r * 0.1} q ${r * 0.4} ${-r * 0.05} ${r * 0.5} ${r * 0.3} q ${-r * 0.1} ${r * 0.35} ${-r * 0.35} ${r * 0.4} q ${-r * 0.2} ${-r * 0.35} ${-r * 0.15} ${-r * 0.7} z`} fill={C.land} />
        {north && <rect x={-r} y={-r} width={2 * r} height={r} fill={north} opacity={northOpacity} />}
        {south && <rect x={-r} y={0} width={2 * r} height={r} fill={south} opacity={southOpacity} />}
        <line x1={-r} y1={0} x2={r} y2={0} stroke={C.paper} strokeWidth={Math.max(2, r * 0.03)} strokeDasharray={`${r * 0.08} ${r * 0.06}`} opacity={0.9} />
      </g>
      <circle r={r} fill="none" stroke={C.ink} strokeWidth={Math.max(2, r * 0.025)} />
      {axis > 0 && <line x1={0} y1={-r * axis} x2={0} y2={r * axis} stroke={C.ink} strokeWidth={Math.max(3, r * 0.035)} strokeLinecap="round" />}
      {axis > 0 && <circle cx={0} cy={-r * axis} r={Math.max(4, r * 0.05)} fill={C.ink} />}
    </g>
  );
}
