// Sunlit: the Moon makes no light. Three rays run from the Sun and light the half that faces it; the other half
// stays in night, and the two halves are named.
import {interpolate, useTime} from '@motionhub/runtime';
import {C, FACE, T, ease, glide} from './kit.tsx';
import {Sun} from './bodies.tsx';

const M = {x: 1250, y: 560, r: 300};

export function Sunlit() {
  const t = useTime();
  const enter = interpolate(t, [0, 0.5], [0, 1], ease);
  const rays = interpolate(t, [0.5, 1.4], [0, 1], ease);
  const lit = interpolate(t, [1.2, 2.0], [0, 1], ease);
  const split = interpolate(t, [4.0, 4.7], [0, 1], ease);
  const nameLit = interpolate(t, [4.3, 4.9], [0, 1], glide);
  const nameNight = interpolate(t, [4.9, 5.5], [0, 1], glide);
  const {x, y, r} = M;
  const half = `M${x} ${y - r}A${r} ${r} 0 0 0 ${x} ${y + r}Z`;
  return (
    <>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs><filter id="sunlit-bloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={28} /></filter></defs>
        <Sun x={-40} y={y} r={220} />
        {[-190, 0, 190].map((dy) => {
          const x0 = 230, x1 = x - Math.round(Math.sqrt(r * r - dy * dy)) - 8;
          return <path key={dy} d={`M${x0} ${y + dy}H${Math.round(x0 + (x1 - x0) * rays)}`} stroke={C.sun} strokeWidth={5} strokeLinecap="round" opacity={rays > 0 ? 0.9 : 0} />;
        })}
        <g opacity={enter}>
          <circle cx={x} cy={y} r={r} fill={C.moonNight} />
          <path d={half} fill={C.moon} opacity={0.45 * lit} filter="url(#sunlit-bloom)" />
          <path d={half} fill={C.moon} opacity={lit} />
          <path d={`M${x} ${y - r - 30}V${y + r + 30}`} stroke={C.dim} strokeWidth={3} strokeDasharray="10 12" opacity={split} />
          <text x={x - 150} y={y + 17} textAnchor="middle" fontFamily={FACE} fontSize={T.label} fontWeight={700} fill={C.ground} opacity={nameLit}>亮的一半</text>
          <text x={x + 150} y={y + 17} textAnchor="middle" fontFamily={FACE} fontSize={T.label} fontWeight={700} fill={C.dim} opacity={nameNight}>暗的一半</text>
        </g>
      </svg>
    </>
  );
}
