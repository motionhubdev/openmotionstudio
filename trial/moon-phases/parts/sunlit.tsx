// Sunlit: the Moon makes no light. Sunlight runs in from the left and lights the half that faces it; the other
// half stays in night, whatever the Moon does.
import {Easing, interpolate, useTime} from '@motionhub/runtime';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Arc} from '../motions/@iamsuosi/night-diagram/react/parts/arc.tsx';
import {C, CANVAS} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';
import {MOON_DARK, MOON_LIT, Sun} from './bodies.tsx';

const MOON = {x: 1250, y: 500, r: 280};
/** Three rays from the Sun to the Moon's sunward face. */
const RAYS: Array<Array<[number, number]>> = [
  [[180, 330], [990, 330]],
  [[230, 500], [970, 500]],
  [[180, 670], [990, 670]],
];

export function Sunlit() {
  const t = useTime();
  const ease = {easing: Easing.inOutCubic, clamp: true} as const;
  const enter = interpolate(t, [0, 0.5], [0, 1], ease);
  const rays = interpolate(t, [0.5, 1.3], [0, 1], ease);
  const lit = interpolate(t, [1.2, 2.0], [0, 1], ease);
  const divide = interpolate(t, [4.1, 4.9], [0, 1], ease);
  const pinLit = interpolate(t, [4.3, 5.1], [0, 1], {easing: Easing.linear, clamp: true});
  const pinDark = interpolate(t, [5.1, 5.9], [0, 1], {easing: Easing.linear, clamp: true});
  const {x, y, r} = MOON;
  return (
    <>
      <Sun x={-60} y={500} r={230} />
      {RAYS.map((path, i) => <Arc key={i} path={path} t={rays} power={0.9} color={C.ember} width={4} />)}
      <svg {...CANVAS} style={{...CANVAS.style, opacity: enter}}>
        <defs>
          <filter id="sunlit-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={30} /></filter>
        </defs>
        <circle cx={x} cy={y} r={r} fill={MOON_DARK} />
        <path d={`M${x} ${y - r}A${r} ${r} 0 0 0 ${x} ${y + r}Z`} fill={MOON_LIT} opacity={0.5 * lit} filter="url(#sunlit-bloom)" />
        <path d={`M${x} ${y - r}A${r} ${r} 0 0 0 ${x} ${y + r}Z`} fill={MOON_LIT} opacity={lit} />
        <path d={`M${x} ${y - r - 40}V${y + r + 40}`} stroke={C.read} strokeWidth={2} strokeDasharray="8 10" opacity={0.8 * divide} />
      </svg>
      <Pin at={[x - 190, y + 130]} elbow={[x - 340, y + 300]} to={x - 640} text="被照亮的一半" note="朝着太阳" color={C.ember} t={pinLit} />
      <Pin at={[x + 170, y - 150]} elbow={[x + 310, y - 310]} to={x + 590} text="背光的一半" note="没有光，看不见" color={C.read} t={pinDark} />
      <Heading text="月光从哪里来？" sub="月光 = 反射的阳光" at={[80, 64]} size={76} show={enter} sharp={interpolate(t, [1.4, 2.0], [0, 1], ease)} />
    </>
  );
}
