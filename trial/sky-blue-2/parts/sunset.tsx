// Scene "sunset": the same eye at noon and at dusk. The low sun's light crosses far more air, loses its blue on the way, and arrives red.
import {useId} from 'react';
import {useTime} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Mass} from '../motions/@iamsuosi/night-diagram/react/parts/mass.tsx';
import {Motes} from '../motions/@iamsuosi/night-diagram/react/parts/motes.tsx';
import {Reading} from '../motions/@iamsuosi/night-diagram/react/parts/reading.tsx';
import {CANVAS} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';
import {C, DUSK_RED, FRAME, Glow, Sun, ease, pathOf, type Pt} from './light.tsx';

// the planet, much larger than the frame, its top at y 800; its air a shell 240 px deep: illustrative, not to scale
const EARTH: Pt = [960, 2500], R = 1700, AIR = 240;
const EYE: Pt = [960, 776];
const NOON: Pt = [960, 140], DUSK: Pt = [70, 786];
const lin = (x: number) => x;

export function SunsetSky() {
  const t = useTime();
  return <Sky land={null} stars={50} glow={[120, 790, 1300]} light={ease(t, 8.3, 9.4, 0, 0.6)} tone={DUSK_RED} />;
}

export function Planet() {
  const t = useTime();
  return <>
    <svg {...CANVAS}><circle cx={EARTH[0]} cy={EARTH[1]} r={R + AIR} fill={C.line} opacity={0.2} /></svg>
    <Mass puffs={[[EARTH[0], EARTH[1], R, 0.1]]} from={EARTH} grow={1} low={C.land} high={C.night} />
    <Mass puffs={[[960, 804, 20, 0.45], [960, 772, 13, 0.85]]} from={[960, 800]} grow={1} high="#8CA2CC" drift={t * 2} />
  </>;
}

/** Noon: the sun overhead, its light crossing a thin layer of air; it dims as the evening comes. */
export function Noon() {
  const t = useTime();
  const dim = ease(t, 0.6, 1.6, 1, 0.22);
  return <>
    <Glow d={pathOf([[NOON[0], NOON[1] + 50], [EYE[0], EYE[1] - 20]])} color={C.core} width={5} power={dim} />
    <Sun at={NOON} r={40} power={dim} />
  </>;
}

/** Dusk: the sun on the horizon, its light running the long way through the air, white at first and red by the time it arrives. */
export function Dusk() {
  const t = useTime();
  const id = useId().replace(/:/g, '');
  const run = ease(t, 1.4, 3.0);
  const redden = ease(t, 4.6, 7.2);
  const mid = `rgb(255, ${Math.round(255 - 40 * redden)}, ${Math.round(255 - 120 * redden)})`;
  const tail = `rgb(255, ${Math.round(255 - 90 * redden)}, ${Math.round(255 - 180 * redden)})`;
  const sun = ease(t, 8.3, 9.4);
  const k = Math.max(0.001, run);
  const x1 = DUSK[0] + 50 + (EYE[0] - 30 - DUSK[0] - 50) * k;
  return <>
    <svg {...CANVAS}>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={DUSK[0]} y1={0} x2={EYE[0]} y2={0}>
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="0.5" stopColor={mid} /><stop offset="1" stopColor={tail} />
        </linearGradient>
        <filter id={`${id}a`} {...FRAME}><feGaussianBlur stdDeviation={11} /></filter>
        <filter id={`${id}b`} {...FRAME}><feGaussianBlur stdDeviation={3} /></filter>
      </defs>
      {run > 0.001 && <g style={{mixBlendMode: 'screen'}}>
        <path d={`M${DUSK[0] + 50} ${DUSK[1]}H${Math.round(x1)}`} stroke={`url(#${id}g)`} strokeWidth={22} opacity={0.55} filter={`url(#${id}a)`} strokeLinecap="round" />
        <path d={`M${DUSK[0] + 50} ${DUSK[1]}H${Math.round(x1)}`} stroke={`url(#${id}g)`} strokeWidth={8} filter={`url(#${id}b)`} strokeLinecap="round" />
        <path d={`M${DUSK[0] + 50} ${DUSK[1]}H${Math.round(x1)}`} stroke={`url(#${id}g)`} strokeWidth={2.5} strokeLinecap="round" />
      </g>}
    </svg>
    <Sun at={DUSK} r={46} tone={sun > 0.01 ? `rgb(255, ${Math.round(251 - 70 * sun)}, ${Math.round(255 - 150 * sun)})` : C.core} power={ease(t, 0.8, 1.4)} />
  </>;
}

/** The blue scattered out along the way: motes of ice light leave the beam upward. */
export function LostBlue() {
  const t = useTime();
  return <Motes n={28} glyph="dot" color={C.ice} size={13} from={[140, 770, 720, 30]} to={[120, 590, 780, 130]} t={ease(t, 4.6, 7.6, 0, 1, lin)} show={ease(t, 4.5, 4.9) * ease(t, 9.2, 10.0, 1, 0.5)} seed={3} />;
}

export function SunsetPins() {
  const t = useTime();
  return <>
    <Pin at={[960, 620]} elbow={[1100, 690]} to={1480} text="正午：只穿过薄薄一层" note="大气层为示意，非比例" t={Math.min(ease(t, 0.9, 1.5, 0, 1, lin), ease(t, 4.2, 4.6, 1, 0))} />
    <Pin at={[EYE[0] - 30, DUSK[1]]} elbow={[1100, 690]} to={1480} text="到达眼睛：只剩红、橙" color={C.ember} t={ease(t, 6.8, 7.4, 0, 1, lin)} />
  </>;
}

/** The scene's one number: how much more air the light crosses from the horizon than from overhead. */
export function AirMass() {
  const t = useTime();
  return <Reading at={[1240, 190]} label="地平线方向穿过的空气" prefix="约" value={38} unit="倍" note="与头顶正上方相比" source="Kasten & Young, 1989" color={C.ember} show={ease(t, 3.0, 3.5)} roll={ease(t, 3.2, 4.1)} />;
}
