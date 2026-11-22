// What every scene of this film shares, on top of Night Diagram's own parts: an eased timing helper,
// the sun, an air molecule, a person looking up, and a light wave drawn to its wavelength.
import {useId, type ReactNode} from 'react';
import {interpolate, Easing, useTime, seededRandom} from '@motionhub/runtime';
import {C, SANS} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';

export {C, SANS};

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

/** A person standing on the land line, head tipped back to look up at the sky, facing `face` (1 right, -1 left). */
export function Person({x, y, scale = 1, face = 1}: {x: number; y: number; scale?: number; face?: number}) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <g transform={`translate(${x} ${y}) scale(${scale * face} ${scale})`} fill="#0A1230" stroke={C.line} strokeWidth={2} strokeLinejoin="round">
        {/* legs, a coat to the knee, shoulders, arms at the sides */}
        <path d="M-13 0 L-10 -44 L-4 -44 L-2 0 Z M3 0 L5 -44 L11 -44 L14 0 Z" />
        <path d="M-22 -40 Q-24 -96 -16 -112 Q0 -124 16 -112 Q24 -96 22 -40 Z" />
        <path d="M-17 -108 Q-26 -84 -25 -58 L-19 -58 Q-18 -84 -12 -100 Z M17 -108 Q26 -84 25 -58 L19 -58 Q18 -84 12 -100 Z" />
        {/* the neck bent back and the head turned up */}
        <path d="M-5 -118 L-3 -128 L7 -127 L6 -117 Z" />
        <ellipse cx={6} cy={-146} rx={17} ry={20} transform="rotate(-28 6 -146)" />
      </g>
    </svg>
  );
}

/** Where the eye of a Person drawn at (x, y, scale, face) is: lit by what reaches it. */
export const eyeOf = (x: number, y: number, scale = 1, face = 1): [number, number] => [Math.round(x + 16 * scale * face), Math.round(y - 152 * scale)];

/** A pool of light on the shared night field, in the colour of what lights it. */
export function Pool({x, y, r, tone, light}: {x: number; y: number; r: number; tone: string; light: number}) {
  if (light <= 0.001) return null;
  return <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, light), background: `radial-gradient(${r}px ${Math.round(r * 0.62)}px at ${x}px ${y}px, rgba(${tone}, 0.9), rgba(${tone}, 0))`}} />;
}

/** The dark land line and its low buildings, as Night Diagram's Sky draws it. */
export function Land({y = 860}: {y?: number}) {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
      <rect x={0} y={y} width={1920} height={1080 - y} fill="#0A1230" />
      <path d={`M300 ${y}V${y - 26}H340V${y}ZM460 ${y}V${y - 46}H500V${y}ZM640 ${y}V${y - 16}H700V${y}ZM1520 ${y}V${y - 22}H1556V${y}Z`} fill="#0A1230" />
    </svg>
  );
}

/** A scene's layer comes up from the shared field over half a second and sinks back in its last 0.4 s;
 *  the cover passes `cover` so its first frame, the thumbnail, is already whole. */
export function SceneFade({dur, cover = false, children}: {dur: number; cover?: boolean; children: ReactNode}) {
  const t = useTime();
  const k = (cover ? 1 : ramp(t, 0, 0.5)) * (1 - ramp(t, dur - 0.4, dur, Easing.inOutSine));
  return <div style={{position: 'absolute', inset: 0, opacity: k}}>{children}</div>;
}

/** Blue leaving a beam: at points along it, one after another between `from` and `to` seconds, short pulses of
 *  ice light fly off sideways and fade as they go, so the beam is seen to lose its blue on the way. */
export function BlueLeaves({a, b, n = 9, from, to, reach = 90, seed = 3}: {a: [number, number]; b: [number, number]; n?: number; from: number; to: number; reach?: number; seed?: number}) {
  const t = useTime();
  const id = useId().replace(/:/g, '');
  const random = seededRandom(seed);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
      <defs><filter id={id} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={4} /></filter></defs>
      <g stroke={C.ice} strokeLinecap="round">
        {Array.from({length: n}, (_, i) => {
          const f = (i + 0.5) / n, px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f;
          const start = from + (to - from - 1.4) * f;
          const twist = random() * 0.5 - 0.25;
          const k = ramp(t, start, start + 1.4, Easing.outCubic);
          if (k <= 0.01) return null;
          return <g key={i}>
            <circle cx={px} cy={py} r={9} fill={C.ice} stroke="none" opacity={0.9 * (1 - 0.6 * k)} filter={`url(#${id})`} />
            {[-1.9, -1.25, 1.25, 1.9].map((d, j) => {
              // each pulse is a short dash flying out from the beam, dimming as it goes
              const ang = Math.atan2(uy, ux) + d + twist, go = 14 + reach * k, tail = Math.max(14, go - 30);
              const x1 = px + Math.cos(ang) * tail, y1 = py + Math.sin(ang) * tail, x2 = px + Math.cos(ang) * go, y2 = py + Math.sin(ang) * go;
              const path = `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
              const o = 1 - 0.75 * k;
              return <g key={j} opacity={o}>
                <path d={path} strokeWidth={12} opacity={0.5} filter={`url(#${id})`} />
                <path d={path} strokeWidth={4} />
              </g>;
            })}
          </g>;
        })}
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
