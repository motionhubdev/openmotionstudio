// The orbit seen from above the North Pole: sunlight from the left, Earth in the middle, the Moon going round it
// anticlockwise with its sunward half lit. Outside the orbit, a ring of the Moon as we see it from Earth builds up one
// phase per line. One picture carried through three scenes (orbit, myth, ending); each passes on where the Moon is.
import {interpolate, useTime} from '@motionhub/runtime';
import {C, FACE, T, ease, glide} from './kit.tsx';
import {HalfLit, PhaseMoon, Sun} from './bodies.tsx';

const E = {x: 1000, y: 500, r: 60};
const R = 210;
const MOON_R = 30;
const RING = 340;
const ICON_R = 52;

/** The Moon's place for an angle on the screen around Earth, in degrees: 180 is new (towards the Sun), decreasing as it goes. */
const at = (a: number, r = R): [number, number] => [Math.round(E.x + r * Math.cos((a * Math.PI) / 180)), Math.round(E.y + r * Math.sin((a * Math.PI) / 180))];
/** What Earth sees at that angle: 0 new, 90 first quarter, 180 full, 270 last quarter. */
const phaseOf = (a: number) => (((180 - a) % 360) + 360) % 360;

/** The four named phases on the ring: the angle, the name, and where the name sits beside its picture. */
const PHASES = [
  {a: 180, name: '新月', dx: -ICON_R - 22, anchor: 'end'},
  {a: 90, name: '上弦', dx: ICON_R + 22, anchor: 'start'},
  {a: 0, name: '满月', dx: ICON_R + 22, anchor: 'start'},
  {a: -90, name: '下弦', dx: ICON_R + 22, anchor: 'start'},
] as const;

/** Moves a value through [second, value] keys, each leg eased. */
function keys(t: number, k: Array<[number, number]>) {
  let v = k[0]![1];
  for (let i = 1; i < k.length; i++) if (t >= k[i - 1]![0]) v = interpolate(t, [k[i - 1]![0], k[i]![0]], [k[i - 1]![1], k[i]![1]], ease);
  return v;
}

function Diagram({angle, orbit = 1, ring, focus, shadow = 0, eclipse = 0, enter = 1}: {angle: number; orbit?: number; ring: number[]; focus?: number; shadow?: number; eclipse?: number; enter?: number}) {
  const [mx, my] = at(angle);
  const circ = 2 * Math.PI * R;
  const tip = E.x + 245 * shadow;
  const half = (x: number) => Math.round(E.r * (1 - ((x - E.x) / 245) * 0.35));
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs><filter id="orbit-soft" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation={5} /></filter></defs>
      <Sun x={-140} y={E.y} r={210} />
      <g opacity={enter}>
        {[-200, -100, 0, 100, 200].map((dy) => <path key={dy} d={`M110 ${E.y + dy}H${E.x - 30}`} stroke={C.sun} strokeWidth={2} opacity={0.2} />)}
        <text x={110} y={E.y + 270} fontFamily={FACE} fontSize={T.note} fontWeight={700} fill={C.sun}>阳光 →</text>
        {shadow > 0 && <path d={`M${E.x} ${E.y - E.r}L${tip} ${E.y - half(tip)}V${E.y + half(tip)}L${E.x} ${E.y + E.r}Z`} fill="#03050F" opacity={0.85} filter="url(#orbit-soft)" />}
        <circle cx={E.x} cy={E.y} r={R} fill="none" stroke={C.line} strokeWidth={3} strokeDasharray={`${circ * orbit} ${circ}`} transform={`rotate(180 ${E.x} ${E.y})`} />
        <HalfLit x={E.x} y={E.y} r={E.r} lit={C.earth} night={C.earthNight} />
        <HalfLit x={mx} y={my} r={MOON_R} lit={C.moon} night={C.moonNight} eclipse={eclipse} />
        {PHASES.map((p, i) => {
          const k = ring[i] ?? 0;
          if (k <= 0) return null;
          const [ix, iy] = at(p.a, RING);
          const dim = focus === undefined || focus === i ? 1 : 0.45;
          const copper = p.a === 0 ? eclipse : 0;
          return (
            <g key={p.name} opacity={k * dim}>
              <g transform={`translate(${ix} ${iy}) scale(${0.6 + 0.4 * k})`}>
                <PhaseMoon r={ICON_R} phase={phaseOf(p.a)} eclipse={copper} />
                <circle r={ICON_R} fill="none" stroke={C.dim} strokeWidth={2} opacity={0.6} />
              </g>
              <text x={ix + p.dx} y={iy + 17} textAnchor={p.anchor} fontFamily={FACE} fontSize={T.label} fontWeight={700} fill={C.ink}>{p.name}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** A label of the diagram's own: words in the chart's ink, arriving on their line. */
function Note({x, y, text, color = C.ink, show, anchor = 'start'}: {x: number; y: number; text: string; color?: string; show: number; anchor?: 'start' | 'end' | 'middle'}) {
  if (show <= 0) return null;
  const left = anchor === 'start' ? x : undefined, right = anchor === 'end' ? 1920 - x : undefined;
  return (
    <div style={{position: 'absolute', left: anchor === 'middle' ? x - 400 : left, right, width: anchor === 'middle' ? 800 : undefined, top: y, textAlign: anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left',
      fontFamily: FACE, fontSize: T.label, fontWeight: 700, color, opacity: show, transform: `translateY(${Math.round((1 - show) * 12)}px)`, whiteSpace: 'nowrap'}}>
      {text}
    </div>
  );
}

/** Scene "orbit": a lap with its length, then new, first quarter, full and last quarter, each added to the ring. */
export function OrbitScene() {
  const t = useTime();
  const angle = keys(t, [[0, 180], [0.7, 180], [3.0, -180], [7.2, -180], [8.6, -270], [10.4, -270], [11.8, -360], [13.4, -360], [14.8, -450]]);
  const ring = [3.9, 8.6, 11.8, 14.8].map((s) => interpolate(t, [s, s + 0.5], [0, 1], glide));
  const focus = t < 8.6 ? 0 : t < 11.8 ? 1 : t < 14.8 ? 2 : 3;
  const card = Math.min(interpolate(t, [0.6, 1.2], [0, 1], glide), interpolate(t, [3.1, 3.6], [1, 0], ease));
  const days = interpolate(t, [0.9, 2.6], [0, 29.5], ease);
  return (
    <>
      <Diagram angle={angle} orbit={interpolate(t, [0.2, 1.5], [0, 1], ease)} ring={ring} focus={focus} enter={interpolate(t, [0, 0.5], [0, 1], ease)} />
      {card > 0 && (
        <div style={{position: 'absolute', left: 1440, top: 300, padding: '24px 34px', borderRadius: 18, background: 'rgba(11,16,38,0.9)', border: `2px solid ${C.line}`, fontFamily: FACE, opacity: card, transform: `translateY(${Math.round((1 - card) * 16)}px)`}}>
          <div style={{fontSize: T.note, fontWeight: 500, color: C.dim}}>绕地球一圈</div>
          <div style={{fontSize: T.headline, fontWeight: 900, color: C.ink, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums'}}>{days.toFixed(1)}<span style={{fontSize: T.label, marginLeft: 10}}>天</span></div>
          <div style={{fontSize: T.small, fontWeight: 500, color: C.dim}}>来源：NASA</div>
        </div>
      )}
    </>
  );
}

/** Scene "myth": Earth's shadow points away from the Sun; a crescent is nowhere near it; a full Moon can fall in it. */
export function MythScene() {
  const t = useTime();
  const angle = keys(t, [[0, -450], [0.3, -450], [1.3, -495], [4.0, -495], [6.0, -720]]);
  const eclipse = interpolate(t, [6.0, 7.0], [0, 1], ease);
  const [mx, my] = at(-495);
  return (
    <>
      <Diagram angle={angle} ring={[1, 1, 1, 1]} focus={eclipse > 0 ? 2 : -1} shadow={interpolate(t, [0.6, 1.6], [0, 1], ease)} eclipse={eclipse} />
      <Note x={E.x + 140} y={E.y + 90} text="地球的影子" color={C.dim} show={interpolate(t, [1.6, 2.2], [0, 1], glide)} />
      <Note x={mx - 50} y={my - 30} anchor="end" text="弯月不在影子里" color={C.sun} show={Math.min(interpolate(t, [2.0, 2.6], [0, 1], glide), interpolate(t, [3.9, 4.3], [1, 0], ease))} />
      <Note x={1340} y={690} anchor="middle" text="月食：日、地、月排成一线" color={C.sun} show={interpolate(t, [6.4, 7.0], [0, 1], glide)} />
    </>
  );
}

/** Scene "ending": the shadow goes, and the Moon goes on round past every phase. */
export function EndingScene() {
  const t = useTime();
  const angle = keys(t, [[0, -720], [0.6, -720], [3.4, -952]]);
  const back = interpolate(t, [0, 0.6], [1, 0], ease);
  return <Diagram angle={angle} ring={[1, 1, 1, 1]} shadow={back} eclipse={back} />;
}
