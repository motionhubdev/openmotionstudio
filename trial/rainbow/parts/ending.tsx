import {useTime, Easing} from '@motionhub/runtime';
import {ease} from './kit';
import {Rings} from './cone';

/** The whole circle, held: what a rainbow is. */
export function EndingPicture() {
  const t = useTime();
  const k = ease(t, [0, 0.6], [0, 1], Easing.outCubic);
  const scale = 0.9 + 0.1 * k + ease(t, [0.6, 4], [0, 0.03], Easing.inOutSine);
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1040" style={{opacity: k}}>
      <g transform={`translate(500 520) scale(${scale.toFixed(4)}) translate(-500 -520)`}>
        <Rings cx={500} cy={520} r={470} band={24} />
      </g>
    </svg>
  );
}
