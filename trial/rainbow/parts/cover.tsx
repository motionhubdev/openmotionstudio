import {useTime, seededRandom} from '@motionhub/runtime';
import {C, SPECTRUM} from './kit';

/** The cover: an arc of rainbow over dark hills after rain, someone watching it with the sun at their back. */
export function CoverPicture() {
  const t = useTime();
  const W = 1080, H = 1400, cx = 540, cy = 860, outer = 460, band = 23;
  const random = seededRandom(3);
  const rain = Array.from({length: 46}, (_, i) => ({i, x: random() * W, y: random() * 900, l: 40 + random() * 50}));
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <g opacity={0.18} stroke={C.drop} strokeWidth={3} strokeLinecap="round">
        {rain.map((d) => {
          const y = (d.y + t * 90) % 900;
          return <line key={d.i} x1={Math.round(d.x)} y1={Math.round(y)} x2={Math.round(d.x - 8)} y2={Math.round(y + d.l)} />;
        })}
      </g>
      {SPECTRUM.map((color, i) => (
        <path key={color} d={`M${cx - (outer - i * band)},${cy} A${outer - i * band},${outer - i * band} 0 0 1 ${cx + (outer - i * band)},${cy}`}
          fill="none" stroke={color} strokeWidth={band + 1} opacity={0.92} />
      ))}
      <path d={`M0,${cy - 40} C200,${cy - 110} 330,${cy - 20} 500,${cy - 50} C700,${cy - 90} 880,${cy - 10} ${W},${cy - 70} L${W},${H} L0,${H} Z`} fill={C.land} />
      {/* someone seen from behind, looking at the arc */}
      <g transform={`translate(540, ${cy + 40})`} fill="#0F1520">
        <circle cx={0} cy={-120} r={26} />
        <path d="M-38,-88 Q0,-100 38,-88 L46,10 L-46,10 Z" />
        <rect x={-30} y={8} width={24} height={70} rx={8} />
        <rect x={6} y={8} width={24} height={70} rx={8} />
      </g>
    </svg>
  );
}
