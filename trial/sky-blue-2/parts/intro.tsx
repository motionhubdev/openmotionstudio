// Scene "intro", the cover: a blue sky lit over the land, the white sun in it, and the question.
import {useTime} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {C, Glow, SKY_BLUE, Sun, ease, pathOf} from './light.tsx';

const SUN: [number, number] = [1480, 250];

/** The field, a daytime sky at frame 0 (the thumbnail): the whole sky filled with scattered blue light, palest at the horizon.
 * Brighter than Night Diagram's dark field on purpose, so the opening reads as a clear day, not a night. Radial, not linear, so it does not band. */
export function IntroSky() {
  const day = `radial-gradient(2400px 1300px at 960px 900px, #A9D4FF 0%, #6FAEF2 38%, #3F7FD6 70%, #2A62B8 100%)`;
  return <>
    <Sky land={880} stars={0} glow={[960, 760, 1500]} light={0.62} tone={SKY_BLUE} />
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 880, background: day}} />
  </>;
}

export function IntroSun() {
  const t = useTime();
  // the second line asks where the blue comes from: white light runs down from the sun towards the land
  const run = ease(t, 3.2, 4.4);
  return <>
    <Glow d={pathOf([SUN, [1020, 860]])} color={C.core} width={6} draw={run} power={0.9} />
    <Sun at={SUN} r={62} />
  </>;
}

export function IntroPins() {
  const t = useTime();
  return <>
    <Pin at={[700, 600]} elbow={[560, 470]} to={300} text="天空：蓝色" note="晴天抬头看到的" color={C.ink} t={ease(t, 0.9, 1.6, 0, 1, (x) => x)} />
    <Pin at={[1530, 300]} elbow={[1620, 440]} to={1840} text="阳光：白色" note="近乎纯白" color={C.ink} t={ease(t, 3.4, 4.0, 0, 1, (x) => x)} />
  </>;
}
