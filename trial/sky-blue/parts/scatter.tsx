// Scene 3: a beam of sunlight crosses a field of air molecules; a lens opens on one of them and shows the
// light thrown out in every direction, blue much further than red; one reading gives the ratio.
import {useTime, seededRandom, Easing} from '@motionhub/runtime';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Lens} from '../motions/@iamsuosi/night-diagram/react/parts/lens.tsx';
import {Reading} from '../motions/@iamsuosi/night-diagram/react/parts/reading.tsx';
import {C, Beam, Scatter, BlueLeaves, ramp} from './common.tsx';

const BEAM_Y = 430;
const PICKED: [number, number] = [860, 430];

/** The air: molecules everywhere, dim; the beam runs through them on the first line. */
export function Air({dimAt}: {dimAt: number}) {
  const t = useTime();
  const random = seededRandom(11);
  const dots = Array.from({length: 90}, () => ({x: Math.round(40 + random() * 1840), y: Math.round(250 + random() * 600)}));
  const dim = 1 - 0.5 * ramp(t, dimAt, dimAt + 0.6);
  return (
    <>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0, opacity: dim * ramp(t, 0, 0.5)}}>
        {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={9} fill={C.dusk} stroke={C.line} strokeWidth={2} />)}
        <circle cx={PICKED[0]} cy={PICKED[1]} r={12} fill={C.dusk} stroke={C.read} strokeWidth={3} />
      </svg>
      <Beam from={[-20, BEAM_Y]} to={[1940, BEAM_Y]} t={ramp(t, 0.4, 2.6, Easing.inOutSine)} width={10} />
    </>
  );
}

/** The lens on one molecule (second line), then blue leaving the beam at molecule after molecule (third line). */
export function Closer({lensAt, ratioAt}: {lensAt: number; ratioAt: number}) {
  const t = useTime();
  const open = ramp(t, lensAt, lensAt + 0.8);
  const blue = ramp(t, lensAt + 0.7, lensAt + 2.2, Easing.outCubic);
  const red = ramp(t, lensAt + 0.7, lensAt + 2.2, Easing.outCubic);
  return (
    <>
      <BlueLeaves a={[80, BEAM_Y]} b={[1180, BEAM_Y]} n={8} from={ratioAt + 0.2} to={ratioAt + 3.4} reach={110} seed={4} />
      <Lens at={[1440, 470]} r={220} from={PICKED} show={open} label="一个空气分子（放大示意）">
        <g transform="translate(-1440 -470)">
          <Beam from={[1200, 470]} to={[1418, 470]} width={8} />
        </g>
      </Lens>
      {open > 0.6 && <Scatter x={1440} y={470} r={26} blue={blue * (0.7 + 0.3 * ramp(t, ratioAt, ratioAt + 1))} red={red} reach={170} show={ramp(t, lensAt + 0.5, lensAt + 0.9)} />}
    </>
  );
}

export function Ratio({at}: {at: number}) {
  const t = useTime();
  return <Reading at={[20, 20]} label="蓝光（450 纳米）被散射的程度，是红光（700 纳米）的" prefix="约" value={6} unit="倍" note="散射强度与波长的四次方成反比" source="瑞利散射公式 · 计算值" color={C.ice} show={ramp(t, at, at + 0.5)} roll={ramp(t, at + 0.2, at + 1.4)} />;
}

export function ScatterTitle() {
  const t = useTime();
  return <Heading text="光撞上空气分子" at={[80, 44]} size={84} show={ramp(t, 0, 0.5)} />;
}
