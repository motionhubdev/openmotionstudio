import {useTime, Easing} from '@motionhub/runtime';
import {C, FACE, T, ramp, Earth} from './kit';
import {STAGE} from './orbit';
import {SideOrbit, PLACES, place, TILT} from './tilt';

/**
 * The seasons, put together: the orbit from the tilt scene, every axis leaning the same way. In June the northern half
 * faces the sun and is warm, in December it faces away and is cold; then the southern halves light the other way.
 */
export function Summary() {
  const t = useTime();
  const north = ramp(t, 0.6, 1.4, Easing.outCubic);
  const south = ramp(t, 3.6, 4.4, Easing.outCubic);
  const june = place(Math.PI);
  const dec = place(0);
  return (
    <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{display: 'block'}}>
      <SideOrbit>
        {PLACES.map((p) => {
          const at = place(p.a);
          const tint = p.key === 'june' ? [C.warm, C.cold] : p.key === 'december' ? [C.cold, C.warm] : [undefined, undefined];
          return (
            <Earth key={p.key} cx={at.x} cy={at.y} r={p.key === 'june' || p.key === 'december' ? 80 : 56} tilt={TILT}
              north={tint[0]} south={tint[1]} northOpacity={0.9 * north} southOpacity={0.9 * south} />
          );
        })}
      </SideOrbit>
      <text x={june.x} y={june.y + 200} textAnchor="middle" fill={C.ink} opacity={north} style={{font: `700 ${T.label}px ${FACE}`}}>六月</text>
      <text x={dec.x} y={dec.y + 200} textAnchor="middle" fill={C.ink} opacity={north} style={{font: `700 ${T.label}px ${FACE}`}}>十二月</text>
      <text x={june.x} y={june.y - 170} textAnchor="middle" fill={C.warm} opacity={north} style={{font: `700 ${T.label}px ${FACE}`}}>北半球：夏</text>
      <text x={dec.x} y={dec.y - 170} textAnchor="middle" fill={C.cold} opacity={north} style={{font: `700 ${T.label}px ${FACE}`}}>北半球：冬</text>
      <text x={june.x} y={june.y + 260} textAnchor="middle" fill={C.cold} opacity={south} style={{font: `700 ${T.label}px ${FACE}`}}>南半球：冬</text>
      <text x={dec.x} y={dec.y + 260} textAnchor="middle" fill={C.warm} opacity={south} style={{font: `700 ${T.label}px ${FACE}`}}>南半球：夏</text>
    </svg>
  );
}
