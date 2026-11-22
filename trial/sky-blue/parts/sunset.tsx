// Scene 5: the Earth's curve and its air (thickness exaggerated). At noon sunlight crosses a thin layer;
// at sunset it runs a long way through it, loses its blue on the way, and arrives red.
import {useId} from 'react';
import {useTime, Easing} from '@motionhub/runtime';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Reading} from '../motions/@iamsuosi/night-diagram/react/parts/reading.tsx';
import {C, Sun, Beam, Person, Pool, BlueLeaves, ramp} from './common.tsx';

const R = 2200, AIR = 260, CX = 960, CY = 840 + R;
const VIEWER: [number, number] = [960, 840];
const LOW_SUN: [number, number] = [70, 790];

export function SunsetSky({redAt}: {redAt: number}) {
  const t = useTime();
  return <Pool x={160} y={800} r={1400} tone="255, 182, 92" light={0.75 * ramp(t, redAt, redAt + 2.4)} />;
}

/** The planet's edge and its shell of air. */
export function Earth() {
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
      <circle cx={CX} cy={CY} r={R + AIR} fill={C.ice} fillOpacity={0.1} stroke={C.ice} strokeOpacity={0.35} strokeWidth={2} />
      <circle cx={CX} cy={CY} r={R} fill={C.land} stroke={C.line} strokeWidth={2} />
    </svg>
  );
}

/** Noon's short path, then the sunset's long one, which turns from white to ember as its blue scatters away. */
export function Paths({longAt, redAt}: {longAt: number; redAt: number}) {
  const t = useTime();
  const id = useId().replace(/:/g, '');
  const run = ramp(t, longAt + 0.3, longAt + 2, Easing.inOutSine);
  const red = ramp(t, redAt, redAt + 2.4);
  const end: [number, number] = [LOW_SUN[0] + (VIEWER[0] - 20 - LOW_SUN[0]) * run, LOW_SUN[1] + (VIEWER[1] - 40 - LOW_SUN[1]) * run];
  return (
    <>
      <Beam from={[960, 330]} to={[960, 790]} width={8} opacity={1 - 0.5 * ramp(t, longAt, longAt + 0.6)} />
      <Sun x={960} y={300} r={34} power={1 - 0.6 * ramp(t, longAt, longAt + 0.6)} />
      <Pin at={[960, 520]} elbow={[1060, 400]} to={1500} text="正午：穿过的空气薄" t={ramp(t, 0.3, 1.1)} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={LOW_SUN[0]} y1={LOW_SUN[1]} x2={VIEWER[0]} y2={VIEWER[1]}>
            <stop offset={0} stopColor="#FFFFFF" />
            <stop offset={Math.max(0.01, 1 - red)} stopColor="#FFFFFF" />
            <stop offset={1} stopColor={red > 0.02 ? C.ember : '#FFFFFF'} />
          </linearGradient>
          <filter id={`${id}b`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={10} /></filter>
        </defs>
        {run > 0.01 && <g strokeLinecap="round">
          <path d={`M${LOW_SUN[0]} ${LOW_SUN[1]}L${end[0]} ${end[1]}`} stroke={`url(#${id})`} strokeWidth={26} opacity={0.5} filter={`url(#${id}b)`} />
          <path d={`M${LOW_SUN[0]} ${LOW_SUN[1]}L${end[0]} ${end[1]}`} stroke={`url(#${id})`} strokeWidth={6} />
        </g>}
      </svg>
      <BlueLeaves a={[LOW_SUN[0] + 80, LOW_SUN[1] + 3]} b={[VIEWER[0] - 120, VIEWER[1] - 36]} n={8} from={redAt} to={redAt + 3.2} reach={80} seed={8} />
      <Sun x={LOW_SUN[0]} y={LOW_SUN[1]} r={40} tint={C.ember} power={ramp(t, longAt, longAt + 0.5)} />
      <Person x={VIEWER[0]} y={VIEWER[1]} scale={0.8} face={-1} />
    </>
  );
}

export function Thickness({at}: {at: number}) {
  const t = useTime();
  return <Reading at={[20, 20]} label="日落时阳光穿过的空气" prefix="约" value={38} unit="倍" note="与太阳在头顶时相比 · 图为示意" source="地平线处 · Kasten & Young 1989" color={C.ember} show={ramp(t, at, at + 0.5)} roll={ramp(t, at + 0.2, at + 1.4)} />;
}

export function SunsetTitle() {
  const t = useTime();
  return <Heading text="为什么夕阳是红的？" at={[80, 44]} size={84} show={ramp(t, 0, 0.5)} />;
}
