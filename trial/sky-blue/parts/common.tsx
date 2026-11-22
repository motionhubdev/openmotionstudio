// What every scene of this film shares, on top of Night Diagram's own parts: an eased timing helper,
// the sun, an air molecule, a person looking up, and a light wave drawn to its wavelength.
import {useId} from 'react';
import {interpolate, Easing} from '@motionhub/runtime';
import {C, SANS} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';

export {C, SANS};
export const MOTION = '../motions/@iamsuosi/night-diagram/react/parts';

/** 0 → 1 between two seconds, eased and clamped. */
export const ramp = (t: number, a: number, b: number, easing = Easing.inOutCubic) => interpolate(t, [a, b], [0, 1], {easing, clamp: true});

/** The sun: the brightest light, a white core inside two blooms. */
export function Sun({x, y, r = 46, tint = C.core, power = 1}: {x: number; y: number; r?: number; tint?: string; power?: number}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <filter id={`${id}a`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation={r * 0.9} /></filter>
        <filter id={`${id}b`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={r * 0.25} /></filter>
      </defs>
      <g opacity={power}>
        <circle cx={x} cy={y} r={r * 2.2} fill={tint} opacity={0.35} filter={`url(#${id}a)`} />
        <circle cx={x} cy={y} r={r * 1.15} fill={tint} opacity={0.8} filter={`url(#${id}b)`} />
        <circle cx={x} cy={y} r={r} fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/** A soft beam of light along a straight path, white by default; `t` runs it out from its start. */
export function Beam({from, to, t = 1, color = '#FFFFFF', width = 10, opacity = 1}: {from: [number, number]; to: [number, number]; t?: number; color?: string; width?: number; opacity?: number}) {
  const id = useId().replace(/:/g, '');
  const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t;
  if (t <= 0.001) return null;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs><filter id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={width * 1.2} /></filter></defs>
      <g opacity={opacity} strokeLinecap="round">
        <path d={`M${from[0]} ${from[1]}L${x} ${y}`} stroke={color} strokeWidth={width * 3} opacity={0.45} filter={`url(#${id})`} />
        <path d={`M${from[0]} ${from[1]}L${x} ${y}`} stroke={color} strokeWidth={width * 0.5} opacity={0.95} />
      </g>
    </svg>
  );
}

/** A person standing on the land line, head tipped back to look at the sky. */
export function Person({x, y, scale = 1}: {x: number; y: number; scale?: number}) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <g transform={`translate(${x} ${y}) scale(${scale})`} fill="#0A1230" stroke={C.line} strokeWidth={2}>
        <path d="M-20 0 L-14 -70 Q-16 -110 0 -118 Q18 -110 16 -70 L22 0 Z" />
        <circle cx={6} cy={-140} r={20} />
      </g>
    </svg>
  );
}

/** A light wave whose crests are `wavelength` px apart, drawn across `w` px. */
export function Wave({w, wavelength, amp = 18, color, draw = 1}: {w: number; wavelength: number; amp?: number; color: string; draw?: number}) {
  if (draw <= 0.01) return <div style={{height: amp * 2 + 8}} />;
  const n = Math.max(2, Math.round(w / 4));
  const pts = Array.from({length: n + 1}, (_, i) => {
    const x = (i / n) * w;
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${(amp + Math.sin((x / wavelength) * Math.PI * 2) * amp).toFixed(1)}`;
  }).join('');
  return (
    <svg width={w} height={amp * 2 + 8} viewBox={`0 -4 ${w} ${amp * 2 + 8}`} style={{display: 'block', overflow: 'visible'}}>
      <path d={pts} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
    </svg>
  );
}

/** An air molecule hit by light: rays leave it in every direction. `blue` and `red` (0–1) say how far the
 *  short- and long-wave rays have gone; blue ones reach further because blue is scattered more. */
export function Scatter({x, y, r = 22, blue, red, n = 12, reach = 200, show = 1}: {x: number; y: number; r?: number; blue: number; red: number; n?: number; reach?: number; show?: number}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs><filter id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={5} /></filter></defs>
      <g opacity={show} strokeLinecap="round">
        {Array.from({length: n}, (_, i) => {
          const a = (i / n) * Math.PI * 2 + 0.2;
          const isBlue = i % 3 !== 1;
          const k = isBlue ? blue : red * 0.35;
          if (k <= 0.01) return null;
          const len = reach * k, x1 = x + Math.cos(a) * (r + 8), y1 = y + Math.sin(a) * (r + 8);
          const x2 = x + Math.cos(a) * (r + 8 + len), y2 = y + Math.sin(a) * (r + 8 + len);
          const col = isBlue ? C.ice : C.ember;
          return <g key={i}>
            <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={col} strokeWidth={14} opacity={0.4} filter={`url(#${id})`} />
            <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={col} strokeWidth={4} />
          </g>;
        })}
        <circle cx={x} cy={y} r={r} fill={C.dusk} stroke={C.read} strokeWidth={3} />
      </g>
    </svg>
  );
}
