// The bodies: the Sun (the one light), the Moon (lit only where the Sun reaches it) and Earth, as flat rounds.
import {useId} from 'react';
import {C} from './kit.tsx';

const mixHex = (a: string, b: string, k: number) => {
  const p = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i]! - v) * k)).join(',')})`;
};

/**
 * The Moon as seen from Earth at elongation `phase` in degrees (0 new, 90 first quarter, 180 full, 270 last quarter),
 * drawn around (0, 0); waxing phases lit on the right, as from the northern hemisphere. `eclipse` 0..1 turns it copper.
 */
export function PhaseMoon({r, phase, eclipse = 0, glow = 1}: {r: number; phase: number; eclipse?: number; glow?: number}) {
  const id = useId().replace(/:/g, '');
  const p = ((phase % 360) + 360) % 360;
  const c = Math.cos((p * Math.PI) / 180);
  const rx = Math.max(0.5, Math.abs(c) * r);
  const lit = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${c > 0 ? 0 : 1} 0 ${-r}Z`;
  const face = mixHex(C.moon, C.copper, eclipse);
  return (
    <g>
      <defs><filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={Math.max(2, r * 0.1)} /></filter></defs>
      <circle r={r} fill={C.moonNight} />
      {(1 - c) / 2 > 0.004 && (
        <g transform={p <= 180 ? undefined : 'scale(-1 1)'}>
          <path d={lit} fill={face} opacity={0.5 * glow * (1 - eclipse * 0.7)} filter={`url(#${id}g)`} />
          <path d={lit} fill={face} opacity={1 - eclipse * 0.3} />
        </g>
      )}
    </g>
  );
}

/** A body seen from above with the Sun far to the left: its left half lit. */
export function HalfLit({x, y, r, lit, night, eclipse = 0}: {x: number; y: number; r: number; lit: string; night: string; eclipse?: number}) {
  return (
    <g transform={`translate(${Math.round(x)} ${Math.round(y)})`}>
      <circle r={r} fill={night} />
      <path d={`M0 ${-r}A${r} ${r} 0 0 0 0 ${r}Z`} fill={eclipse > 0 ? mixHex(lit, C.copper, eclipse) : lit} />
    </g>
  );
}

/** The Sun past the left edge: an amber disc in a radial bloom. */
export function Sun({x, y, r}: {x: number; y: number; r: number}) {
  const id = useId().replace(/:/g, '');
  return (
    <g>
      <defs>
        <radialGradient id={`${id}b`}>
          <stop offset="0%" stopColor={C.sun} stopOpacity={0.6} />
          <stop offset="60%" stopColor={C.sun} stopOpacity={0.15} />
          <stop offset="100%" stopColor={C.sun} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r * 2.4} fill={`url(#${id}b)`} />
      <circle cx={x} cy={y} r={r} fill={C.sun} />
      <circle cx={x} cy={y} r={r * 0.86} fill="#FFE3AE" />
    </g>
  );
}
