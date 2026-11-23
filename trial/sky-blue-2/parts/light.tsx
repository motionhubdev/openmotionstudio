// Light of this film's own, in Night Diagram's way: a white core inside blooms of its colour, built by blur. Only light glows.
import {useId} from 'react';
import {Easing, interpolate} from '@motionhub/runtime';
import {C, CANVAS, clamp} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';

export {C};
export type Pt = [number, number];

/** An eased, clamped tween of t from [a, b] to [from, to]. */
export const ease = (t: number, a: number, b: number, from = 0, to = 1, easing = Easing.inOutCubic) =>
  interpolate(t, [a, b], [from, to], {easing, clamp: true});
/** On from `on` until `off`, in and out over `fade`. */
export const shown = (t: number, on: number, off: number, fade = 0.5) => Math.min(ease(t, on, on + fade), ease(t, off, off + fade, 1, 0));

/** A blur's region as the whole frame. */
export const FRAME = {filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1920, height: 1080} as const;

export const pathOf = (pts: Pt[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${Math.round(x)} ${Math.round(y)}`).join('');

/** A sine wave of light along y from x0 to x1: `length` px from crest to crest, so long red and short blue read at a glance. */
export const wave = (x0: number, x1: number, y: number, length: number, amp: number): Pt[] =>
  Array.from({length: Math.ceil((x1 - x0) / 4) + 1}, (_, i) => {
    const x = Math.min(x1, x0 + i * 4);
    return [x, y + Math.sin(((x - x0) / length) * Math.PI * 2) * amp];
  });

/** A path of light that runs along itself as `draw` goes 0 to 1. */
export function Glow({d, color, width = 5, draw = 1, power = 1}: {d: string; color: string; width?: number; draw?: number; power?: number}) {
  const id = useId().replace(/:/g, '');
  const k = clamp(draw), p = clamp(power);
  if (k <= 0.001 || p <= 0.001) return null;
  const line = {d, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round', pathLength: 1, strokeDasharray: `${k} 2`} as const;
  return (
    <svg {...CANVAS}>
      <defs>
        {/* in the frame's units: a straight level or upright path has a box of no height or width, which would clip its bloom away */}
        <filter id={`${id}a`} {...FRAME}><feGaussianBlur stdDeviation={width * 2.2} /></filter>
        <filter id={`${id}b`} {...FRAME}><feGaussianBlur stdDeviation={width * 0.6} /></filter>
      </defs>
      <g opacity={p} style={{mixBlendMode: 'screen'}}>
        <path {...line} stroke={color} strokeWidth={width * 4} opacity={0.55} filter={`url(#${id}a)`} />
        <path {...line} stroke={color} strokeWidth={width * 1.6} filter={`url(#${id}b)`} />
        <path {...line} stroke={C.core} strokeWidth={width * 0.45} opacity={0.8} />
      </g>
    </svg>
  );
}

/** The sun: the brightest light in the picture, a white disc in its own bloom; `tone` warms it as it sets. */
export function Sun({at, r = 64, tone = C.core, power = 1}: {at: Pt; r?: number; tone?: string; power?: number}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg {...CANVAS}>
      <defs>
        <radialGradient id={`${id}g`}><stop offset="0" stopColor={tone} stopOpacity={0.75} /><stop offset="0.35" stopColor={tone} stopOpacity={0.22} /><stop offset="1" stopColor={tone} stopOpacity={0} /></radialGradient>
      </defs>
      <g opacity={clamp(power)}>
        <circle cx={at[0]} cy={at[1]} r={r * 4.2} fill={`url(#${id}g)`} />
        <circle cx={at[0]} cy={at[1]} r={r} fill={tone} />
        <circle cx={at[0]} cy={at[1]} r={r * 0.78} fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/** The sky's blue as a light pooled on the field, in every scene that shows it: one colour, one meaning. */
export const SKY_BLUE = '120, 190, 255';
/** The setting sun's red, pooled at the horizon. */
export const DUSK_RED = '255, 160, 80';
