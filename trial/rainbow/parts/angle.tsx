import {useTime, seededRandom, Easing} from '@motionhub/runtime';
import {C, T, Label, ease, arrowHead} from './kit';

export const EYE = {x: 130, y: 560};
const L = 560;
const RAD = (42 * Math.PI) / 180;
const UP = {x: Math.round(EYE.x + L * Math.cos(RAD)), y: Math.round(EYE.y - L * Math.sin(RAD))};
const DOWN = {x: UP.x, y: Math.round(EYE.y + L * Math.sin(RAD))};

/** An angle's arc at the eye, from the sight line to `sign` × 42°, swept by `k`. */
function arc(k: number, sign: 1 | -1, r = 170) {
  const a = RAD * k;
  const x = EYE.x + r * Math.cos(a), y = EYE.y - sign * r * Math.sin(a);
  return `M${EYE.x + r},${EYE.y} A${r},${r} 0 0 ${sign === 1 ? 0 : 1} ${x},${y}`;
}

/** The eye, drawn simply: a head in profile looking right. */
export function Eye({x, y}: {x: number; y: number}) {
  return (
    <g>
      <circle cx={x - 40} cy={y} r={58} fill="#0F1520" stroke={C.dim} strokeWidth={3} />
      <path d={`M${x - 14},${y} Q${x},${y - 14} ${x + 14},${y} Q${x},${y + 14} ${x - 14},${y} Z`} fill={C.ink} />
      <circle cx={x + 2} cy={y} r={6} fill="#0F1520" />
    </g>
  );
}

function RedRay({from, k}: {from: {x: number; y: number}; k: number}) {
  const x = from.x + (EYE.x + 24 - from.x) * k, y = from.y + (EYE.y - from.y) * k;
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={x} y2={y} stroke={C.red} strokeWidth={8} strokeLinecap="round" />
      {k > 0.98 && <path d={arrowHead(x, y, EYE.x - from.x, EYE.y - from.y, 30)} fill={C.red} />}
    </g>
  );
}

/** Sunlight from behind you, a drop it meets, and the red light that drop sends back to your eye at 42°. */
export function AnglePicture() {
  const t = useTime();
  const enter = ease(t, [0, 0.5], [0, 1]);
  const ray1 = ease(t, [0.6, 1.7], [0, 1]);
  const arc1 = ease(t, [1.6, 2.8], [0, 1], Easing.outCubic);
  const deg1 = Math.round(ease(t, [1.6, 2.8], [0, 42], Easing.outQuart));
  const rain = ease(t, [4.1, 4.7], [0, 1]);
  const sun2 = ease(t, [4.3, 4.9], [0, 1]);
  const ray2 = ease(t, [4.9, 5.9], [0, 1]);
  const arc2 = ease(t, [5.7, 6.6], [0, 1], Easing.outCubic);
  const random = seededRandom(11);
  const drops = Array.from({length: 60}, (_, i) => ({i, x: 640 + random() * 340, y: 130 + random() * 880}))
    .filter((d) => Math.abs(d.y - EYE.y) > 90);
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1040" style={{opacity: enter}}>
      <g opacity={rain * 0.5}>
        {drops.map((d) => <circle key={d.i} cx={Math.round(d.x)} cy={Math.round(d.y)} r={9} fill={C.drop} />)}
      </g>
      <Label x={20} y={70} anchor="start" color={C.sun}>阳光从你身后照来 →</Label>
      <line x1={0} y1={UP.y} x2={UP.x - 30} y2={UP.y} stroke={C.sun} strokeWidth={6} opacity={0.8} />
      <path d={arrowHead(UP.x - 30, UP.y, 1, 0, 26)} fill={C.sun} opacity={0.8} />
      <g opacity={sun2}>
        <line x1={0} y1={DOWN.y} x2={DOWN.x - 30} y2={DOWN.y} stroke={C.sun} strokeWidth={6} opacity={0.8} />
        <path d={arrowHead(DOWN.x - 30, DOWN.y, 1, 0, 26)} fill={C.sun} opacity={0.8} />
      </g>
      {/* the sight line: straight ahead, the way the sunlight goes */}
      <line x1={EYE.x + 30} y1={EYE.y} x2={990} y2={EYE.y} stroke={C.ink} strokeWidth={4} strokeDasharray="18 16" opacity={0.75} />
      <Label x={980} y={EYE.y + 50} anchor="end" color={C.ink} size={T.small}>你的视线（顺着阳光）</Label>
      <RedRay from={UP} k={ray1} />
      <circle cx={UP.x} cy={UP.y} r={24} fill={C.drop} stroke={C.ink} strokeWidth={3} />
      {arc1 > 0 && <path d={arc(arc1, 1)} fill="none" stroke={C.red} strokeWidth={6} />}
      <Label x={EYE.x + 230} y={EYE.y - 90} anchor="start" color={C.red} size={T.figure} weight={700} opacity={ease(t, [1.6, 1.9], [0, 1])}>{`${deg1}°`}</Label>
      <g opacity={ease(t, [4.7, 5.1], [0, 1])}>
        <RedRay from={DOWN} k={ray2} />
        <circle cx={DOWN.x} cy={DOWN.y} r={24} fill={C.drop} stroke={C.ink} strokeWidth={3} />
      </g>
      {arc2 > 0 && <path d={arc(arc2, -1)} fill="none" stroke={C.red} strokeWidth={6} />}
      <Label x={EYE.x + 230} y={EYE.y + 100} anchor="start" color={C.red} size={T.figure} weight={700} opacity={arc2}>42°</Label>
      <Eye x={EYE.x} y={EYE.y} />
      <Label x={EYE.x - 40} y={EYE.y + 110} color={C.ink} weight={700}>你</Label>
    </svg>
  );
}
