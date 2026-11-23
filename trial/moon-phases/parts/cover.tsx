// The cover: the question, and one big Moon whose lit face thins and fills, as it does from night to night.
import {Easing, interpolate, useTime} from '@motionhub/runtime';
import {Heading} from '../motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {C, CANVAS} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';
import {PhaseDisc} from './bodies.tsx';

export const COVER_MOON = {x: 1250, y: 470, r: 300};

/** The Moon's elongation over the cover: a crescent at frame 0, full by 2.6 s, a crescent again by 4.4 s. */
export function coverPhase(t: number) {
  const ease = {easing: Easing.inOutCubic, clamp: true} as const;
  return t < 2.8 ? interpolate(t, [0.9, 2.6], [52, 180], ease) : interpolate(t, [2.8, 4.4], [180, 308], ease);
}

export function Cover() {
  const t = useTime();
  const {x, y, r} = COVER_MOON;
  const pin = interpolate(t, [1.2, 2.0], [0, 1], {easing: Easing.linear, clamp: true});
  return (
    <>
      <svg {...CANVAS}>
        <g transform={`translate(${x} ${y})`}>
          <PhaseDisc r={r} phase={coverPhase(t)} />
        </g>
      </svg>
      <Pin at={[x - 250, y + 150]} elbow={[x - 430, y + 300]} to={x - 760} text="月相" note="每晚看到的亮面形状" color={C.ink} t={pin} />
      <Heading text="月亮为什么有圆缺？" sub="同一个月亮，每晚样子都不同" at={[80, 64]} size={76} show={1} sharp={1} />
    </>
  );
}
