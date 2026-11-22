// Scene 4: from points all over the sky, scattered blue light comes down to one person's eye,
// and the whole field turns blue.
import {useTime, seededRandom, Easing} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {C, Sun, Beam, Person, ramp} from './common.tsx';

const LAND = 860;
const EYE: [number, number] = [1262, LAND - 154];
const SUN: [number, number] = [260, 230];

export function BlueSky({fillAt}: {fillAt: number}) {
  const t = useTime();
  return <Sky land={LAND} stars={40} glow={[960, 480, 1700]} light={0.12 + 0.6 * ramp(t, fillAt, fillAt + 2)} tone="127, 233, 255" />;
}

/** The sun's beam, and blue rays from points across the sky to the eye, one after another. */
export function ToTheEye() {
  const t = useTime();
  const random = seededRandom(5);
  const points = Array.from({length: 14}, (_, i) => ({i, x: Math.round(120 + random() * 1700), y: Math.round(160 + random() * 420)}));
  return (
    <>
      <Beam from={SUN} to={[760, LAND]} width={10} />
      <Sun x={SUN[0]} y={SUN[1]} r={44} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        {points.map(({i, x, y}) => {
          const k = ramp(t, 0.4 + i * 0.12, 1.4 + i * 0.12, Easing.outCubic);
          if (k <= 0) return null;
          const ex = x + (EYE[0] - x) * k, ey = y + (EYE[1] - y) * k;
          return <g key={i}>
            <circle cx={x} cy={y} r={8} fill={C.ice} />
            <path d={`M${x} ${y}L${ex} ${ey}`} stroke={C.ice} strokeWidth={3} strokeDasharray="10 12" opacity={0.8} />
          </g>;
        })}
      </svg>
      <Person x={1250} y={LAND} scale={1.1} />
      <Pin at={EYE} elbow={[1420, 620]} to={1840} text="你的眼睛" note="哪个方向都有蓝光进来" t={ramp(t, 1.8, 2.6)} />
    </>
  );
}

export function BlueTitle() {
  const t = useTime();
  return <Heading text="蓝光来自天空各处" at={[80, 44]} size={84} show={ramp(t, 0, 0.5)} />;
}
