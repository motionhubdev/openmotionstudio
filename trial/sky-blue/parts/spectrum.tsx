// Scene 2: white sunlight meets a prism and leaves as a fan of colours; pins name the two ends and
// a wave beside each shows its length (red's crests 700/450 ≈ 1.56 times as far apart as blue's).
import {useTime, Easing} from '@motionhub/runtime';
import {Sky} from '../motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {Refraction} from '../motions/@iamsuosi/night-diagram/react/parts/refraction.tsx';
import {C, Wave, ramp} from './common.tsx';

const PRISM = {kind: 'prism' as const, at: [760, 520] as [number, number], side: 340};
const CARD = {kind: 'card' as const, at: [1240, 720] as [number, number], rot: 0, w: 320};

export function SpectrumSky() {
  return <Sky land={null} stars={60} />;
}

export function Prism({pinsAt}: {pinsAt: number}) {
  const t = useTime();
  return (
    <>
      <Refraction from={[200, 800]} aim={-33} glass={[PRISM, CARD]} reach={1500 * ramp(t, 0.3, 2.6, Easing.inOutSine)} power={ramp(t, 0.2, 0.6)} />
      <Pin at={[1240, 712]} elbow={[1340, 470]} to={1840} text="红光" note="波长长：约 700 纳米" color={C.ember} t={ramp(t, pinsAt, pinsAt + 0.8)} />
      <Pin at={[1240, 786]} elbow={[1340, 690]} to={1840} text="蓝光" note="波长短：约 450 纳米" color={C.ice} t={ramp(t, pinsAt + 0.5, pinsAt + 1.3)} />
    </>
  );
}

/** One wave under each pin, drawn after its pin; both at one scale so their lengths compare. */
export function Waves({at}: {at: number}) {
  const t = useTime();
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 172}}>
      <Wave w={480} wavelength={156} color={C.ember} draw={ramp(t, at + 0.6, at + 1.6)} />
      <Wave w={480} wavelength={100} color={C.ice} draw={ramp(t, at + 1.1, at + 2.1)} />
    </div>
  );
}

export function SpectrumTitle() {
  const t = useTime();
  return <Heading text="白光里藏着所有颜色" at={[80, 44]} size={84} show={ramp(t, 0, 0.5)} />;
}
