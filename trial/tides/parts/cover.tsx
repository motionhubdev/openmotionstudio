import {interpolate, Easing, useTime} from '@motionhub/runtime';
import {C, FONT, T} from './kit';

/** The title, there from frame 0 (the thumbnail). */
export function CoverTitle() {
  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18}}>
      <div style={{font: `700 ${T.cover}px/1.05 ${FONT.head}`, color: C.ink}}>
        <span style={{color: C.water}}>潮汐</span>
        <br />
        是怎么来的？
      </div>
    </div>
  );
}

const W = 820;
const H = 760;

/** A harbour wall with a tide pole: the water stands high at t = 0, falls, then rises again. */
export function Harbour() {
  const t = useTime();
  // One fall and rise over the scene: level 1 is high water, 0 is low.
  const fall = interpolate(t, [0.6, 2.2], [1, 0], {easing: Easing.inOutSine, clamp: true});
  const rise = interpolate(t, [2.4, 3.6], [0, 1], {easing: Easing.inOutSine, clamp: true});
  const level = t < 2.3 ? fall : rise;
  const highY = 300;
  const lowY = 520;
  const waterY = Math.round(lowY + (highY - lowY) * level);
  const wave = (x: number) => Math.round(waterY + 8 * Math.sin(x / 70 + t * 1.6));
  const surface = Array.from({length: 42}, (_, i) => {
    const x = i * 20;
    return `${x},${wave(x)}`;
  }).join(' ');
  const pole = 560;
  const ticks = Array.from({length: 9}, (_, i) => 260 + i * 40);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <radialGradient id="moonglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.moon} stopOpacity="0.35" />
          <stop offset="1" stopColor={C.moon} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="seafade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="seamask"><rect x={0} y={0} width={W} height={H} fill="url(#seafade)" /></mask>
      </defs>
      {/* the moon over the harbour */}
      <circle cx={200} cy={130} r={140} fill="url(#moonglow)" />
      <circle cx={200} cy={130} r={62} fill={C.moon} />
      {/* the tide pole with its marks */}
      <rect x={pole - 8} y={220} width={16} height={460} rx={4} fill={C.ink} opacity={0.85} />
      {ticks.map((y, i) => (
        <rect key={y} x={pole + 8} y={y} width={i % 2 === 0 ? 46 : 26} height={6} fill={C.ink} opacity={0.85} />
      ))}
      {/* the high and low water marks */}
      <line x1={pole - 120} x2={pole + 110} y1={highY} y2={highY} stroke={C.accent} strokeWidth={4} strokeDasharray="14 10" />
      <line x1={pole - 120} x2={pole + 110} y1={lowY} y2={lowY} stroke={C.dim} strokeWidth={4} strokeDasharray="14 10" />
      {/* the water */}
      <g mask="url(#seamask)">
        <polygon points={`0,${H} ${surface} ${W},${H}`} fill={C.water} opacity={0.55} />
        <polyline points={surface} fill="none" stroke={C.water} strokeWidth={5} />
      </g>
      <text x={pole - 140} y={highY + 14} textAnchor="end" fill={C.accent} style={{font: `700 ${T.small}px ${FONT.body}`}}>涨潮</text>
      <text x={pole - 140} y={lowY + 14} textAnchor="end" fill={C.ink} style={{font: `700 ${T.small}px ${FONT.body}`}}>落潮</text>
      {/* the harbour wall */}
      <path d={`M ${W - 150} ${H} L ${W - 150} 240 L ${W} 240 L ${W} ${H} Z`} fill={C.land} />
      <rect x={W - 150} y={232} width={150} height={16} fill={C.ink} opacity={0.5} />
    </svg>
  );
}
