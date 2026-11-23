// A schematic, not measured data: the spread of daily temperatures as a bell curve. Shift it a little to the right
// and the share beyond the old extreme-heat line grows several times over. Labelled as an illustration on screen.
import {useTime} from '@motionhub/runtime';
import {tween} from './kit.tsx';

const W = 1600, H = 560;
const BASE_Y = 470, PEAK = 380;
const X0 = 220, X1 = 1380; // the x axis spans -3.2 to +4 standard deviations
const Z_MIN = -3.2, Z_MAX = 4;
const LINE_Z = 1.28; // the old line: the hottest tenth of the old curve lies beyond it
const SHIFT = 0.7; // how far the illustration moves the curve, in standard deviations

const sx = (z: number) => Math.round(X0 + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * (X1 - X0));
const pdf = (z: number) => Math.exp(-z * z / 2);
const curve = (mu: number) => {
  const pts: string[] = [];
  for (let z = Z_MIN; z <= Z_MAX + 1e-6; z += 0.05) pts.push(`${pts.length ? 'L' : 'M'}${sx(z)} ${Math.round(BASE_Y - PEAK * pdf(z - mu))}`);
  return pts.join('');
};
const tail = (mu: number) => {
  const pts = [`M${sx(LINE_Z)} ${BASE_Y}`];
  for (let z = LINE_Z; z <= Z_MAX + 1e-6; z += 0.05) pts.push(`L${sx(z)} ${Math.round(BASE_Y - PEAK * pdf(z - mu))}`);
  pts.push(`L${sx(Z_MAX)} ${BASE_Y}Z`);
  return pts.join('');
};

const label = {fontFamily: 'var(--font-sans)', fontSize: 30} as const;

export function Tail() {
  const t = useTime();
  const mu = tween(t, 1.0, 2.4, 0, SHIFT); // line 1: the average moves a little
  const now = tween(t, 1.0, 1.3, 0, 1);
  const hot = tween(t, 4.6, 5.8, 0, 1); // line 2: the hot tail fills
  const oldDim = tween(t, 1.0, 2.0, 1, 0.45);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={X0} x2={X1} y1={BASE_Y} y2={BASE_Y} stroke="var(--color-faint)" strokeWidth={2} />
      <text x={X0} y={BASE_Y + 50} {...label} fill="var(--color-muted)">较冷的日子</text>
      <text x={X1} y={BASE_Y + 50} textAnchor="end" {...label} fill="var(--color-muted)">较热的日子 →</text>

      {/* the old curve, and its hottest tenth beyond the line */}
      <path d={tail(0)} fill="var(--color-muted)" fillOpacity={0.35 * oldDim} />
      <path d={curve(0)} fill="none" stroke="var(--color-muted)" strokeWidth={4} opacity={oldDim + 0.2} />
      <text x={sx(-1.5)} y={BASE_Y - PEAK * pdf(1.5) - 24} textAnchor="end" {...label} fill="var(--color-muted)">工业化前</text>

      {/* the new curve: the same shape, moved right */}
      <g opacity={now}>
        <path d={tail(mu)} fill="var(--color-data)" fillOpacity={0.55 * hot} />
        <path d={curve(mu)} fill="none" stroke="var(--color-text)" strokeWidth={4} />
        <text x={sx(mu) } y={BASE_Y - PEAK - 22} textAnchor="middle" {...label} fill="var(--color-text)">现在</text>
      </g>

      {/* the means, and the small step between them */}
      <line x1={sx(0)} x2={sx(0)} y1={BASE_Y} y2={BASE_Y - PEAK} stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="6 8" />
      <g opacity={now}>
        <path d={`M${sx(0)} ${BASE_Y - PEAK / 2}H${sx(mu) - 4}`} stroke="var(--color-text)" strokeWidth={3} />
        <path d={`M${sx(mu)} ${BASE_Y - PEAK / 2}l-16 -10v20Z`} fill="var(--color-text)" opacity={mu > 0.2 ? 1 : 0} />
        <text x={Math.round((sx(0) + sx(mu)) / 2)} y={BASE_Y - PEAK / 2 + 44} textAnchor="middle" {...label} fill="var(--color-text)">平均值</text>
      </g>

      {/* the old extreme-heat line */}
      <line x1={sx(LINE_Z)} x2={sx(LINE_Z)} y1={BASE_Y} y2={70} stroke="var(--color-text)" strokeWidth={2} strokeDasharray="10 8" />
      <text x={sx(LINE_Z) + 18} y={96} {...label} fill="var(--color-text)">过去的极端高温线</text>
      <g opacity={hot}>
        <text x={sx(3.0)} y={BASE_Y - 220} textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={600} fontSize={40} fill="var(--color-data)">越线的日子</text>
        <text x={sx(3.0)} y={BASE_Y - 170} textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={600} fontSize={40} fill="var(--color-data)">多出几倍</text>
      </g>
    </svg>
  );
}
