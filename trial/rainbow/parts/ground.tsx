import {useTime, Easing} from '@motionhub/runtime';
import {C, T, Label, ease, FACE} from './kit';
import {Rings} from './cone';

const W = 1080, H = 1520, CX = 540, CY = 500, R = 430, HORIZON = 430;

/** A small plane, drawn as one shape, nose to the left. */
function Plane({x, y}: {x: number; y: number}) {
  return (
    <path transform={`translate(${x}, ${y})`} fill={C.ink}
      d="M-120,0 Q-112,-14 -80,-14 L-10,-14 L40,-84 L62,-84 L40,-14 L92,-14 L112,-44 L126,-44 L118,-12 Q130,0 118,12 L126,44 L112,44 L92,14 L40,14 L62,84 L40,84 L-10,14 L-80,14 Q-112,14 -120,0 Z" />
  );
}

/** The full circle of the rainbow; the ground hides its lower part, and from a plane the ground falls away. */
export function GroundPicture() {
  const t = useTime();
  const enter = ease(t, [0, 0.5], [0, 1]);
  const rise = ease(t, [0.3, 1.5], [0, 1], Easing.outCubic);
  const fall = ease(t, [3.8, 5.3], [0, 1], Easing.inOutCubic);
  const plane = ease(t, [3.9, 5.0], [0, 1], Easing.outCubic);
  const landTop = Math.round(H + (HORIZON - H) * rise + (H - HORIZON) * fall);
  const hidden = ease(t, [1.2, 1.8], [0, 1]) * (1 - fall);
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{opacity: enter}}>
      <defs>
        <clipPath id="sky"><rect x={0} y={0} width={W} height={landTop} /></clipPath>
      </defs>
      <g clipPath="url(#sky)"><Rings cx={CX} cy={CY} r={R} /></g>
      <rect x={0} y={landTop} width={W} height={H} fill={C.land} />
      <circle cx={CX} cy={CY} r={R - 70} fill="none" stroke={C.ink} strokeWidth={3} strokeDasharray="14 16" opacity={0.35 * hidden} />
      <Label x={CX} y={HORIZON + 330} color={C.ink} size={T.label} opacity={0.85 * hidden}>这一半被地面挡住</Label>
      <g opacity={plane} transform={`translate(${Math.round((1 - plane) * 160)}, 0)`}>
        <Plane x={860} y={90} />
      </g>
      <text x={CX} y={CY} fill={C.ink} fontFamily={FACE} fontSize={T.label} fontWeight={700} textAnchor="middle"
        dominantBaseline="middle" opacity={ease(t, [5.0, 5.6], [0, 1])}>整圈彩虹</text>
    </svg>
  );
}
