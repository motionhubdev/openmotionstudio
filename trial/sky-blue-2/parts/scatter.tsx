// Scene "scatter": sunlight (a red and a blue wave together) meets one air molecule; the blue is thrown every way, the red goes on.
import {useTime} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Mass} from '../motions/@iamsuosi/night-diagram/react/parts/mass.tsx';
import {Pulse} from '../motions/@iamsuosi/night-diagram/react/parts/pulse.tsx';
import {Reading} from '../motions/@iamsuosi/night-diagram/react/parts/reading.tsx';
import {C, Glow, ease, pathOf, wave} from './light.tsx';

const AT: [number, number] = [980, 470];
const HIT = 4.2; // the second line: the blue is thrown off
/** The directions the blue leaves in, in degrees, clear of the red's way on and of the pin's line. */
const RAYS = [30, 70, 110, 150, 250, 290, 330];
const REACH = 240;
const end = (deg: number): [number, number] => [AT[0] + Math.cos((deg * Math.PI) / 180) * REACH, AT[1] + Math.sin((deg * Math.PI) / 180) * REACH];

export function ScatterSky() {
  return <Sky land={null} stars={60} />;
}

/** Red and blue arrive together, at their true ratio of wavelengths (700 to 450); the red goes on past the molecule. */
export function Waves() {
  const t = useTime();
  const arrive = ease(t, 0.3, 2.3);
  return <>
    <Glow d={pathOf(wave(0, AT[0] - 40, AT[1], 160, 34))} color={C.ember} width={4} draw={arrive} />
    <Glow d={pathOf(wave(0, AT[0] - 40, AT[1], 103, 34))} color={C.ice} width={4} draw={arrive} power={ease(t, HIT + 0.3, HIT + 1.2, 1, 0.35)} />
    <Glow d={pathOf(wave(AT[0] + 40, 1880, AT[1], 160, 34))} color={C.ember} width={4} draw={ease(t, 5.4, 6.6)} />
  </>;
}

/** One molecule of the air: two atoms, a body rather than a light, lit for a moment as the blue strikes it. */
export function Molecule() {
  const t = useTime();
  const light = t < HIT ? 0 : ease(t, HIT, HIT + 1.4, 1, 0.2);
  return <Mass puffs={[[AT[0] - 26, AT[1], 34, 0.55], [AT[0] + 26, AT[1], 34, 0.75]]} from={AT} grow={1} drift={t * 2} lit={[AT[0], AT[1], 120]} light={light} />;
}

/** The blue thrown every way: short paths of ice light that run out fast, and rings leaving the molecule. */
export function Scattered() {
  const t = useTime();
  return <>
    {RAYS.map((deg, i) => <Glow key={deg} d={pathOf([AT, end(deg)])} color={C.ice} width={4} draw={ease(t, HIT + i * 0.03, HIT + 0.25 + i * 0.03)} power={ease(t, HIT + 2.5, HIT + 4, 1, 0.6)} />)}
    <Pulse at={AT} r={420} n={5} color={C.ice} t={ease(t, HIT, HIT + 3, 0, 1, (x) => x)} />
  </>;
}

export function ScatterPins() {
  const t = useTime();
  const lin = (x: number) => x;
  return <>
    <Pin at={[AT[0] - 26, AT[1] - 20]} elbow={[700, 250]} to={360} text="空气分子" note="氮气、氧气，比光波小得多" t={ease(t, 1.9, 2.5, 0, 1, lin)} />
    <Pin at={end(70)} elbow={[1240, 770]} to={1640} text="蓝光：弹向四面八方" note="这就是散射" color={C.ice} t={ease(t, 4.8, 5.4, 0, 1, lin)} />
    <Pin at={[1450, AT[1]]} elbow={[1520, 340]} to={1860} text="红光：大多穿过" color={C.ember} t={ease(t, 6.4, 7.0, 0, 1, lin)} />
  </>;
}

/** The scene's one number: how much more blue is scattered than red, by Rayleigh's law, a calculation and labelled as one. */
export function Ratio() {
  const t = useTime();
  // (700 / 450) ** 4 = 5.86
  return <Reading at={[80, 560]} label="蓝光被散射的强度，是红光的" prefix="约" value={6} unit="倍" note="450 对 700 纳米，按 1/λ⁴ 计算" source="瑞利散射定律 · 计算值" color={C.ice} show={ease(t, 8.5, 9.0)} roll={ease(t, 8.7, 9.8)} />;
}
