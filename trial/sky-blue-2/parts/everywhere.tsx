// Scene "everywhere": a beam of sunlight crosses the sky; every bit of air along it sends blue down to the eye, so the whole sky glows.
import {useTime} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Mass} from '../motions/@iamsuosi/night-diagram/react/parts/mass.tsx';
import {C, Glow, SKY_BLUE, ease, pathOf, type Pt} from './light.tsx';

const EYE: Pt = [960, 792];
const A: Pt = [-100, 250], B: Pt = [2020, 390];
/** Air along the beam, evenly across the sky. */
const AIR: Pt[] = Array.from({length: 9}, (_, i) => {
  const x = 160 + i * 200;
  return [x, A[1] + ((x - A[0]) / (B[0] - A[0])) * (B[1] - A[1])];
});
const order = [4, 3, 5, 2, 6, 1, 7, 0, 8];

export function EverywhereSky() {
  const t = useTime();
  // the second line: the sky fills with the blue the air sends down
  return <Sky land={880} stars={30} glow={[960, 760, 1700]} light={ease(t, 3.9, 5.6, 0.08, 0.62)} tone={SKY_BLUE} />;
}

export function Beam() {
  const t = useTime();
  return <Glow d={pathOf([A, B])} color={C.core} width={6} draw={ease(t, 0, 0.8)} power={0.85} />;
}

/** From each bit of air, blue runs down to the eye, one after another from the middle out. */
export function ToTheEye() {
  const t = useTime();
  return <>
    {order.map((k, i) => {
      const s = 0.7 + i * 0.22;
      const end: Pt = [EYE[0] + (AIR[k][0] - EYE[0]) * 0.06, EYE[1] - 24];
      return <g key={k}>
        <Glow d={pathOf([AIR[k], end])} color={C.ice} width={3} draw={ease(t, s, s + 0.45)} power={ease(t, 4.5, 6, 1, 0.45)} />
        <circle cx={AIR[k][0]} cy={AIR[k][1]} r={9} fill={C.ice} opacity={ease(t, s - 0.2, s)} />
      </g>;
    })}
  </>;
}

/** The person looking up: a body, not a light. */
export function Viewer() {
  const t = useTime();
  return <>
    <Mass puffs={[[960, 852, 36, 0.45], [960, 792, 24, 0.85]]} from={[960, 880]} grow={1} high="#8CA2CC" drift={t * 2} />
    <Pin at={[978, 786]} elbow={[1060, 830]} to={1440} text="你的眼睛" note="四面八方都有蓝光射来" t={ease(t, 2.6, 3.2, 0, 1, (x) => x)} />
  </>;
}
