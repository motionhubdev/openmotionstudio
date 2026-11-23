import {useTime, Easing} from '@motionhub/runtime';
import {C, SPECTRUM, T, Label, ease} from './kit';
import {Eye} from './angle';

const APEX = {x: 120, y: 520};
const BASE_X = 640, RY = 468, RX_SIDE = 140;
const DROPS = 18;

/** The rainbow's rings, red outside, centred at (cx, cy) with outer radius r. */
export function Rings({cx, cy, r, band = 20, opacity = 1}: {cx: number; cy: number; r: number; band?: number; opacity?: number}) {
  return (
    <g opacity={opacity} fill="none">
      {SPECTRUM.map((color, i) => <circle key={color} cx={cx} cy={cy} r={r - band / 2 - i * band} stroke={color} strokeWidth={band + 1} />)}
    </g>
  );
}

/** Every drop at 42° around the sight line: a cone with its tip at your eye, then seen from the tip, a circle. */
export function ConePicture() {
  const t = useTime();
  const enter = ease(t, [0, 0.5], [0, 1]);
  const lines = ease(t, [0.4, 1.6], [0, 1]);
  const turn = ease(t, [4.3, 5.8], [0, 1], Easing.inOutCubic);
  const rings = ease(t, [5.4, 6.3], [0, 1]);
  const cx = BASE_X + (500 - BASE_X) * turn;
  const rx = RX_SIDE + (RY - RX_SIDE) * turn;
  const side = 1 - turn;
  const top = {x: BASE_X, y: APEX.y - RY}, bottom = {x: BASE_X, y: APEX.y + RY};
  const len = Math.hypot(top.x - APEX.x, top.y - APEX.y);
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1040" style={{opacity: enter}}>
      <g opacity={side}>
        <path d={`M${APEX.x},${APEX.y} L${top.x},${top.y} A${RX_SIDE},${RY} 0 0 1 ${bottom.x},${bottom.y} Z`} fill={C.red} opacity={0.1 * lines} />
        {[top, bottom].map((p, i) => (
          <line key={i} x1={APEX.x} y1={APEX.y} x2={p.x} y2={p.y} stroke={C.red} strokeWidth={5}
            strokeDasharray={len} strokeDashoffset={len * (1 - lines)} />
        ))}
        <line x1={APEX.x + 30} y1={APEX.y} x2={BASE_X + 300} y2={APEX.y} stroke={C.ink} strokeWidth={4} strokeDasharray="18 16" opacity={0.6} />
      </g>
      <ellipse cx={Math.round(cx)} cy={APEX.y} rx={Math.round(rx)} ry={RY} fill="none" stroke={C.red} strokeWidth={4}
        strokeDasharray="10 14" opacity={0.6 * (1 - rings)} />
      {Array.from({length: DROPS}, (_, i) => {
        const phi = (i / DROPS) * Math.PI * 2;
        const k = ease(t, [1.0 + i * 0.08, 1.4 + i * 0.08], [0, 1], Easing.outBack);
        const behind = Math.cos(phi) < 0 ? 0.45 + 0.55 * turn : 1;
        const x = cx + rx * Math.cos(phi), y = APEX.y + RY * Math.sin(phi);
        return <circle key={i} cx={Math.round(x)} cy={Math.round(y)} r={Math.max(0.01, 16 * k)} fill={C.red} opacity={behind * (1 - rings)} />;
      })}
      <Rings cx={500} cy={APEX.y} r={RY + 14} opacity={rings} />
      <g opacity={side}>
        <Eye x={APEX.x} y={APEX.y} />
        <Label x={10} y={APEX.y + 110} anchor="start" weight={700}>你的眼睛</Label>
        <Label x={APEX.x + 210} y={APEX.y - 40} color={C.red} size={T.label} weight={700} opacity={lines}>42°</Label>
      </g>
      <g opacity={rings}>
        <circle cx={500} cy={APEX.y} r={10} fill={C.ink} />
        <Label x={500} y={APEX.y + 60} size={T.small} color={C.ink}>你的视线</Label>
      </g>
    </svg>
  );
}
