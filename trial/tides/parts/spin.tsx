// Scene "spin": the Earth turns once under its two bulges; a harbour on it rides through both, and its water level
// is drawn beside it as the day goes: two high waters, two low.
import {useTime} from '@motionhub/runtime';
import {C, FONT, T, ramp} from './kit';
import {useCue} from './orbit';

const E = {x: 360, y: 310, r: 150};
const SEA = 175;
const BULGE = 90;

/** The harbour's angle on the Earth: from the top (low water) once round, as the turn is said. */
function useTurn(): {phi: number; progress: number} {
  const t = useTime();
  const start = useCue('spin-turn', '自转');
  const end = useCue('spin-twice', '两次涨潮') + 0.4;
  const progress = ramp(t, start, end);
  return {phi: -Math.PI / 2 + progress * Math.PI * 2, progress};
}

export function SpinningEarth() {
  const t = useTime();
  const enter = ramp(t, 0, 0.5);
  const {phi} = useTurn();
  const sea: string[] = [];
  for (let i = 0; i < 180; i++) {
    const th = (i / 180) * Math.PI * 2;
    const r = SEA + BULGE * Math.cos(th) ** 2;
    sea.push(`${Math.round(E.x + r * Math.cos(th))},${Math.round(E.y + r * Math.sin(th))}`);
  }
  const hx = Math.round(E.x + E.r * Math.cos(phi));
  const hy = Math.round(E.y + E.r * Math.sin(phi));
  // A mark on the land that turns with it, so the turn reads even where the harbour is hidden.
  const meridian = phi + Math.PI;
  return (
    <svg width={860} height={620} viewBox="0 0 860 620" style={{opacity: enter}}>
      <path d={`M ${sea.join(' L ')} Z`} fill={C.water} opacity={0.75} />
      <circle cx={E.x} cy={E.y} r={E.r} fill={C.land} />
      <line x1={E.x} y1={E.y} x2={Math.round(E.x + E.r * Math.cos(meridian))} y2={Math.round(E.y + E.r * Math.sin(meridian))} stroke={C.ink} strokeOpacity={0.25} strokeWidth={4} />
      <line x1={E.x} y1={E.y} x2={hx} y2={hy} stroke={C.ink} strokeOpacity={0.25} strokeWidth={4} />
      <circle cx={hx} cy={hy} r={30} fill="none" stroke={C.accent} strokeWidth={5} />
      <circle cx={hx} cy={hy} r={14} fill={C.accent} />
      {/* the moon's direction */}
      <path d="M 700 302 L 790 302 L 790 286 L 830 310 L 790 334 L 790 318 L 700 318 Z" fill={C.moon} />
      <text x={765} y={390} textAnchor="middle" fill={C.moon} style={{font: `700 ${T.small}px ${FONT.body}`}}>月球</text>
      <text x={hx > E.x ? hx - 44 : hx + 44} y={hy + (hy > E.y ? -40 : 64)} textAnchor={hx > E.x ? 'end' : 'start'} fill={C.accent}
        style={{font: `700 ${T.small}px ${FONT.body}`}}>海岸</text>
    </svg>
  );
}

const G = {x0: 90, x1: 760, mid: 300, amp: 170};

export function TideChart() {
  const t = useTime();
  const enter = ramp(t, 0, 0.5);
  const {progress} = useTurn();
  const high = useCue('spin-twice', '涨潮');
  const low = useCue('spin-twice', '落潮');
  const at = (p: number) => {
    const phi = -Math.PI / 2 + p * Math.PI * 2;
    return {x: Math.round(G.x0 + (G.x1 - G.x0) * p), y: Math.round(G.mid - G.amp * Math.cos(2 * phi))};
  };
  const n = Math.max(1, Math.round(progress * 120));
  const curve = Array.from({length: n + 1}, (_, i) => at((i / 120))).map((p) => `${p.x},${p.y}`).join(' ');
  const now = at(progress);
  const highs = [0.25, 0.75].map(at);
  const lows = [0, 0.5, 1].map(at);
  const showHigh = ramp(t, high, high + 0.5);
  const showLow = ramp(t, low, low + 0.5);
  return (
    <svg width={800} height={620} viewBox="0 0 800 620" style={{opacity: enter}}>
      <rect x={0} y={0} width={800} height={620} rx={24} fill={C.panel} opacity={0.6} />
      <line x1={G.x0} y1={G.mid} x2={G.x1} y2={G.mid} stroke={C.dim} strokeWidth={2} strokeDasharray="10 10" />
      <line x1={G.x0} y1={70} x2={G.x0} y2={530} stroke={C.dim} strokeWidth={3} />
      <text x={G.x0 - 20} y={60} textAnchor="start" fill={C.dim} style={{font: `400 ${T.small}px ${FONT.body}`}}>海岸水位</text>
      <text x={G.x1} y={590} textAnchor="end" fill={C.dim} style={{font: `400 ${T.small}px ${FONT.body}`}}>约一天 →</text>
      <polyline points={curve} fill="none" stroke={C.water} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
      {progress > 0 && progress < 1 ? <circle cx={now.x} cy={now.y} r={14} fill={C.accent} /> : null}
      {highs.map((p, i) => (
        <g key={`h${i}`} opacity={showHigh}>
          <circle cx={p.x} cy={p.y} r={12} fill={C.accent} />
          <text x={p.x} y={p.y - 34} textAnchor="middle" fill={C.accent} style={{font: `700 ${T.small}px ${FONT.body}`}}>涨潮</text>
        </g>
      ))}
      {lows.slice(1).map((p, i) => (
        <g key={`l${i}`} opacity={showLow}>
          <circle cx={p.x} cy={p.y} r={12} fill={C.ink} />
          <text x={p.x - (i === 1 ? 40 : 0)} y={p.y + 62} textAnchor="middle" fill={C.ink} style={{font: `700 ${T.small}px ${FONT.body}`}}>落潮</text>
        </g>
      ))}
    </svg>
  );
}
