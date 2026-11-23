// The film's bodies, drawn in Night Diagram's material: flat soft rounds, no outline or texture, lit by the one real
// light (the Sun, ember). The Moon's lit face is reflected sunlight; Earth is the viewer's side, in ice.
import {useId} from 'react';
import {C} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';

/** The Moon's sunlit face, a pale reflection of the ember Sun. */
export const MOON_LIT = '#EEF3FF';
/** The Moon's night side: a body in the field, a little lighter than the field so it can be seen. */
export const MOON_DARK = '#1A2752';
/** The Moon inside Earth's shadow: copper, the Sun's ember light bent through Earth's air. */
export const MOON_ECLIPSE = '#8A4A2E';

const mixHex = (a: string, b: string, k: number) => {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * k)).join(',')})`;
};

/**
 * The Moon as seen from Earth, at elongation `phase` in degrees (0 new, 90 first quarter, 180 full, 270 last
 * quarter), drawn around (0, 0). Waxing phases are lit on the right, as from the northern hemisphere.
 * `eclipse` 0..1 turns the face copper and dim, as in Earth's shadow.
 */
export function PhaseDisc({r, phase, eclipse = 0, glow = 1}: {r: number; phase: number; eclipse?: number; glow?: number}) {
  const id = useId().replace(/:/g, '');
  const p = ((phase % 360) + 360) % 360;
  const waxing = p <= 180;
  const c = Math.cos((p * Math.PI) / 180); // 1 at new, -1 at full
  const rx = Math.max(0.5, Math.abs(c) * r);
  // the right limb from top to bottom, then back up along the terminator: bulging right for a crescent, left for a gibbous
  const sweep = c > 0 ? 0 : 1;
  const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${sweep} 0 ${-r}Z`;
  const face = mixHex(MOON_LIT, MOON_ECLIPSE, eclipse);
  const shown = (1 - c) / 2; // how much of the face is lit
  return (
    <g>
      <defs>
        <filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={r * 0.12} /></filter>
      </defs>
      <circle r={r} fill={MOON_DARK} />
      {shown > 0.004 && (
        <g transform={waxing ? undefined : 'scale(-1 1)'}>
          <path d={lit} fill={face} opacity={0.55 * glow * (1 - eclipse * 0.7)} filter={`url(#${id}g)`} />
          <path d={lit} fill={face} opacity={1 - eclipse * 0.35} />
        </g>
      )}
    </g>
  );
}

/**
 * A body seen from above with the Sun far to the left: its left half lit, its right half in night.
 * Used for the Moon on its orbit and for Earth.
 */
export function HalfLit({x, y, r, lit, dark, eclipse = 0}: {x: number; y: number; r: number; lit: string; dark: string; eclipse?: number}) {
  const face = eclipse > 0 ? mixHex(lit, MOON_ECLIPSE, eclipse) : lit;
  return (
    <g transform={`translate(${Math.round(x)} ${Math.round(y)})`}>
      <circle r={r} fill={dark} />
      <path d={`M0 ${-r}A${r} ${r} 0 0 0 0 ${r}Z`} fill={face} />
    </g>
  );
}

/** The Sun, the one real light: a white core inside ember blooms, standing past the left edge of the frame. */
export function Sun({x, y, r, power = 1}: {x: number; y: number; r: number; power?: number}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
      <defs>
        <radialGradient id={`${id}b`}>
          <stop offset="0%" stopColor={C.ember} stopOpacity={0.75} />
          <stop offset="55%" stopColor={C.ember} stopOpacity={0.22} />
          <stop offset="100%" stopColor={C.ember} stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={r * 0.08} /></filter>
      </defs>
      <g opacity={power}>
        <circle cx={x} cy={y} r={r * 2.3} fill={`url(#${id}b)`} />
        <circle cx={x} cy={y} r={r * 1.04} fill={C.ember} filter={`url(#${id}f)`} />
        <circle cx={x} cy={y} r={r * 0.92} fill="#FFF6E6" />
      </g>
    </svg>
  );
}
