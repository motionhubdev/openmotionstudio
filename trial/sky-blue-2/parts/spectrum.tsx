// Scene "spectrum": white light through a prism fans out from red to violet, and the two ends are named by wavelength.
import {useTime} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Refraction} from '../motions/@iamsuosi/night-diagram/react/parts/refraction.tsx';
import {WAVES, dirOf, trace, type Optic} from '../motions/@iamsuosi/night-diagram/react/parts/optics.ts';
import {C, Glow, ease, pathOf, wave} from './light.tsx';

// the motion's own setup: a dense flint prism, apex up, met from below near its angle of least deviation, and a card past it
const AIM = -33, FROM: [number, number] = [260 - Math.cos((AIM * Math.PI) / 180) * 260, 690 - Math.sin((AIM * Math.PI) / 180) * 260];
const PRISM: Optic = {kind: 'prism', at: [880, 340], side: 400};
const CARD: Optic = {kind: 'card', at: [1560, 700], rot: 30, w: 440};
/** Where the red (690 nm) and the blue (450 nm) land on the card, traced rather than guessed. */
const land = (nm: number) => trace(FROM, dirOf(AIM), WAVES.find((w) => w.nm === nm)!, [PRISM, CARD]).pts.at(-1)!;
export const RED = land(690), BLUE = land(450);

export function SpectrumSky() {
  return <Sky land={null} stars={60} />;
}

export function Prism() {
  const t = useTime();
  // the glass and card are there from the first frame; the white light runs in on the first line and fans out
  return <Refraction from={FROM} aim={AIM} glass={[PRISM, CARD]} reach={ease(t, 0.4, 2.4, 0, 2000)} power={ease(t, 0.4, 0.7)} />;
}

/** Each end named where it lands; its wave drawn upper left, in its colour: red's crests far apart, blue's close together. */
export function Ends() {
  const t = useTime();
  const red = ease(t, 3.9, 4.6, 0, 1, (x) => x), blue = ease(t, 5.0, 5.7, 0, 1, (x) => x);
  return <>
    <Pin at={RED} elbow={[1640, 560]} to={1880} text="红光：波长长" note="约 700 纳米" color={C.ember} t={red} />
    <Pin at={BLUE} elbow={[1640, 820]} to={1880} text="蓝光：波长短" note="约 450 纳米" color={C.ice} t={blue} />
    <Glow d={pathOf(wave(100, 580, 330, 160, 30))} color={C.ember} width={4} draw={ease(t, 4.2, 5.0)} />
    <Glow d={pathOf(wave(100, 580, 450, 103, 30))} color={C.ice} width={4} draw={ease(t, 5.3, 6.1)} />
  </>;
}
