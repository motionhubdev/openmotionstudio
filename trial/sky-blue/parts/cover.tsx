// Scene 1, the cover: a clear sky over the land, the sun high in it, and the question.
// Frame 0 is the thumbnail, so the question and the blue are there from the first frame, without a fade.
import {useTime} from '@motionhub/runtime';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {C, Sun, Beam, Person, Pool, Land, ramp} from './common.tsx';

const SUN: [number, number] = [1480, 250];
const LAND = 860;

/** The ground of the cover: the blue of a clear day pooled over the land. */
export function CoverSky() {
  return <><Pool x={960} y={560} r={1700} tone="127, 233, 255" light={0.78} /><Land y={LAND} /></>;
}

/** The sun and its white beam down to the land; on the second line a pin names the beam's colour. */
export function CoverSun({pinAt}: {pinAt: number}) {
  const t = useTime();
  return (
    <>
      <Beam from={SUN} to={[1040, LAND]} width={12} />
      <Sun x={SUN[0]} y={SUN[1]} r={52} />
      <Person x={900} y={LAND} scale={1.1} face={1} />
      <Pin at={[1290, 520]} elbow={[1380, 640]} to={1800} text="阳光：白色" note="看上去没有颜色" t={ramp(t, pinAt, pinAt + 0.8)} />
    </>
  );
}

export function CoverTitle() {
  return <Heading text="天空为什么是蓝色的？" sub="写给没学过物理的你" at={[80, 120]} size={110} />;
}

export {C};
