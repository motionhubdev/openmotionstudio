// Scene 6: the two answers side by side: one molecule in the beam, blue thrown out into the sky,
// red carrying on to the sunset.
import {useTime, Easing} from '@motionhub/runtime';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {C, Beam, Scatter, ramp} from './common.tsx';

export function TwoSkies() {
  const t = useTime();
  const k = ramp(t, 0, 0.8);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: k, background: `radial-gradient(900px 620px at 380px 560px, rgba(127, 233, 255, 0.45), rgba(127, 233, 255, 0)), radial-gradient(900px 620px at 1560px 640px, rgba(255, 182, 92, 0.45), rgba(255, 182, 92, 0))`}} />
  );
}

export function OneCause() {
  const t = useTime();
  const run = ramp(t, 0.2, 1.2, Easing.inOutSine);
  return (
    <>
      <Beam from={[0, 600]} to={[940, 600]} t={run} width={10} />
      <Beam from={[980, 600]} to={[1920, 600]} t={ramp(t, 1.0, 2.0, Easing.inOutSine)} color={C.ember} width={10} />
      <Scatter x={960} y={600} r={26} blue={ramp(t, 1.0, 2.2, Easing.outCubic)} red={0} reach={190} n={14} />
      <Pin at={[842, 510]} elbow={[620, 380]} to={180} text="散开的蓝光 → 蓝天" color={C.ice} t={ramp(t, 1.6, 2.4)} />
      <Pin at={[1260, 600]} elbow={[1340, 790]} to={1800} text="留下的红光 → 晚霞" color={C.ember} t={ramp(t, 1.9, 2.7)} />
    </>
  );
}

export function EndingTitle() {
  return <Heading text="一种散射，两种颜色" at={[80, 44]} size={84} />;
}
