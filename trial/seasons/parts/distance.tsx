import {useTime, Easing, interpolate} from '@motionhub/runtime';
import {C, FACE, T, ramp, Earth} from './kit';
import {Orbit, Tag, onOrbit} from './orbit';

// Perihelion about 147.1 million km in early January, aphelion about 152.1 million km in early July
// (NASA, "Earth Fact Sheet", nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html): the far point is about 3% farther.

/**
 * The guess corrected. The imagined orbit relaxes into the true, nearly round one, and the Earth travels to its far
 * end: early July, northern summer. Then early January at the near end, northern winter, and the two distances.
 */
export function Distance() {
  const t = useTime();
  const relax = 1 - ramp(t, 0.3, 1.5);
  const travel = ramp(t, 0.5, 2.3, Easing.inOutSine);
  const july = onOrbit(relax, Math.PI);
  const jan = onOrbit(relax, 0);
  const julyTag = ramp(t, 2.3, 2.8, Easing.outCubic);
  const janIn = ramp(t, 3.0, 3.5, Easing.outCubic);
  const figures = ramp(t, 4.5, 5.0, Easing.outCubic);
  const far = interpolate(t, [4.5, 5.6], [0, 1.52], {easing: Easing.outQuart, clamp: true});
  const near = interpolate(t, [4.5, 5.6], [0, 1.47], {easing: Easing.outQuart, clamp: true});
  const gap = ramp(t, 5.6, 6.1, Easing.outCubic);
  return (
    <div style={{position: 'relative', width: '100%', height: '100%'}}>
      <Orbit myth={relax} earth={travel * Math.PI}>
        <g opacity={janIn}>
          <Earth cx={jan.x} cy={jan.y} r={44} axis={0} />
        </g>
        <Tag x={july.x + 10} y={july.y - 90} color={C.warm} opacity={julyTag}>七月初 · 北半球夏天</Tag>
        <Tag x={jan.x - 10} y={jan.y - 90} color={C.cold} opacity={janIn}>一月初 · 北半球冬天</Tag>
        <Tag x={july.x + 10} y={july.y + 110} color={C.ink} opacity={figures}>{`约 ${far.toFixed(2)} 亿公里 · 较远`}</Tag>
        <Tag x={jan.x - 10} y={jan.y + 110} color={C.ink} opacity={figures}>{`约 ${near.toFixed(2)} 亿公里 · 较近`}</Tag>
      </Orbit>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', opacity: gap, font: `700 ${T.label}px ${FACE}`, color: C.ink}}>
        远近只差约 3%
        <span style={{font: `400 ${T.note}px ${FACE}`, color: C.dim}}>（数据：NASA）</span>
      </div>
    </div>
  );
}
