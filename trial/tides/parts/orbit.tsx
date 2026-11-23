// The Earth–Moon diagram the pull, far and sun scenes share, drawn in the frame's own coordinates (a full-frame layer).
import {Easing, interpolate, useLine, useTime} from '@motionhub/runtime';
import {C, FONT, T, ramp} from './kit';

export const EARTH = {x: 760, y: 520, r: 150};
const SEA = 175;
const MOON_ORBIT = {rx: 800, ry: 330, r: 56};

/** When a phrase of a line starts being said, in the scene's time; the line's start when its words are not known. */
export function useCue(id: string, phrase: string): number {
  const line = useLine(id);
  const words = line.words ?? [];
  const begin = words.map((w) => w.text).join('').indexOf(phrase);
  if (begin < 0) return line.start;
  let at = 0;
  for (const w of words) {
    if (at + w.text.length > begin) return w.start;
    at += w.text.length;
  }
  return line.start;
}

/** The sea around the Earth: a ring that bulges toward (near) and away from (far) the moon's axis, plus the sun's. */
function seaPath(near: number, far: number, axis: number, sun: number, shiftX: number): string {
  const points: string[] = [];
  for (let i = 0; i < 180; i++) {
    const th = (i / 180) * Math.PI * 2;
    const c = Math.cos(th - axis);
    const s = Math.cos(th);
    const r = SEA + near * Math.max(c, 0) ** 2 + far * Math.min(c, 0) ** 2 + sun * s * s;
    points.push(`${Math.round(EARTH.x + shiftX + r * Math.cos(th))},${Math.round(EARTH.y + r * Math.sin(th))}`);
  }
  return `M ${points.join(' L ')} Z`;
}

/** An arrow along x as one filled shape, from x0 for a length (negative points left). */
function Arrow({x0, y, length, color, width = 14}: {x0: number; y: number; length: number; color: string; width?: number}) {
  if (Math.abs(length) < 4) return null;
  const dir = Math.sign(length);
  const head = Math.min(34, Math.abs(length) * 0.6) * dir;
  const tip = x0 + length;
  const h = width / 2;
  const d = `M ${x0} ${y - h} L ${tip - head} ${y - h} L ${tip - head} ${y - h - 14} L ${tip} ${y} L ${tip - head} ${y + h + 14} L ${tip - head} ${y + h} L ${x0} ${y + h} Z`;
  return <path d={d} fill={color} />;
}

function Label({x, y, children, color = C.ink, size = T.label, weight = 700, anchor = 'middle', opacity = 1}: {
  x: number; y: number; children: string; color?: string; size?: number; weight?: number; anchor?: 'start' | 'middle' | 'end'; opacity?: number;
}) {
  return (
    <text x={x} y={y} fill={color} opacity={opacity} textAnchor={anchor} style={{font: `${weight} ${size}px ${FONT.body}`}}>
      {children}
    </text>
  );
}

type View = {
  enter: number; // the scene's own entrance, 0–1
  arrows: [number, number, number]; // far, centre, near arrow, each 0–1 drawn
  relative: number; // 0: the moon's pull at each point; 1: the Earth pulled away from the far water
  near: number; // near bulge, px
  far: number; // far bulge, px
  shift: number; // the Earth's shift toward the moon, px
  moonAngle: number; // radians on the orbit, 0 on the line to the right
  sun: number; // the sun's presence, 0–1
  sunBulge: number; // the sun's own bulge, px
  labels: {text: string; x: number; y: number; show: number; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end'}[];
  align: number; // the dashed line through sun, Earth and moon, 0–1
};

export function Diagram(v: View) {
  const moonX = Math.round(EARTH.x + MOON_ORBIT.rx * Math.cos(v.moonAngle));
  const moonY = Math.round(EARTH.y + MOON_ORBIT.ry * Math.sin(v.moonAngle));
  const axis = Math.atan2(moonY - EARTH.y, moonX - EARTH.x);
  // The moon's pull at the far side, centre and near side: weaker with distance.
  const pulls = [96, 150, 220];
  const relPulls = [-70, 0, 70];
  const xs = [EARTH.x - SEA - 10, EARTH.x, EARTH.x + SEA + 10];
  const sunX = 150;
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{opacity: v.enter}}>
      <defs>
        <radialGradient id="sunglow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.sun} stopOpacity="0.45" />
          <stop offset="1" stopColor={C.sun} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moonhalo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.moon} stopOpacity="0.3" />
          <stop offset="1" stopColor={C.moon} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the line sun–Earth–moon */}
      <line x1={sunX} y1={EARTH.y} x2={sunX + (1720 - sunX) * v.align} y2={EARTH.y} stroke={C.sun} strokeWidth={3} strokeDasharray="16 12" opacity={0.6 * v.align} />
      {/* the sun at the left edge */}
      <g opacity={v.sun}>
        <circle cx={sunX} cy={EARTH.y} r={200} fill="url(#sunglow)" />
        <circle cx={sunX} cy={EARTH.y} r={92} fill={C.sun} />
      </g>
      {/* the sea, then the Earth over it */}
      <path d={seaPath(v.near, v.far, axis, v.sunBulge, v.shift * 0.4)} fill={C.water} opacity={0.75} />
      <circle cx={EARTH.x + v.shift} cy={EARTH.y} r={EARTH.r} fill={C.land} />
      <circle cx={EARTH.x + v.shift} cy={EARTH.y} r={EARTH.r} fill="none" stroke={C.ink} strokeOpacity={0.25} strokeWidth={3} />
      {/* the moon on its orbit */}
      <circle cx={moonX} cy={moonY} r={110} fill="url(#moonhalo)" />
      <circle cx={moonX} cy={moonY} r={MOON_ORBIT.r} fill={C.moon} />
      {/* the moon's pull at three points */}
      {xs.map((x, i) => {
        const len = (pulls[i]! + (relPulls[i]! - pulls[i]!) * v.relative) * v.arrows[i]!;
        const color = i === 1 ? C.moon : C.ink;
        return <Arrow key={i} x0={Math.round(x + (i === 1 ? v.shift : 0))} y={EARTH.y} length={Math.round(len)} color={color} />;
      })}
      {v.labels.map((l) => (
        <Label key={l.text} x={l.x} y={l.y} color={l.color} size={l.size} anchor={l.anchor} opacity={l.show}>{l.text}</Label>
      ))}
    </svg>
  );
}

const out = Easing.outCubic;

/** Scene "pull": the moon's pull, stronger nearer; then the near bulge. */
export function PullDiagram() {
  const t = useTime();
  const enter = interpolate(t, [0, 0.5], [0, 1], {easing: out, clamp: true});
  const gravity = useCue('pull-moon', '引力');
  const nearer = useCue('pull-moon', '越近');
  const nearSide = useCue('pull-near', '朝向');
  const swell = useCue('pull-near', '鼓起');
  const bulge = useCue('pull-near', '隆起');
  const arrows: [number, number, number] = [
    ramp(t, gravity, gravity + 0.6, out),
    ramp(t, gravity + 0.25, gravity + 0.85, out),
    ramp(t, gravity + 0.5, gravity + 1.1, out),
  ];
  const strong = ramp(t, nearer, nearer + 0.5, out);
  return (
    <Diagram
      enter={enter}
      arrows={arrows}
      relative={0}
      near={90 * ramp(t, swell - 0.2, swell + 1.2)}
      far={0}
      shift={0}
      moonAngle={0}
      sun={0}
      sunBulge={0}
      align={0}
      labels={[
        {text: '月球', x: 1560, y: 640, show: enter, color: C.moon},
        {text: '弱', x: EARTH.x - SEA - 70, y: 470, show: strong, color: C.dim},
        {text: '强', x: EARTH.x + SEA + 120, y: 470, show: strong * (1 - ramp(t, nearSide, nearSide + 0.4))},
        {text: '最强', x: EARTH.x + SEA + 120, y: 470, show: ramp(t, nearSide, nearSide + 0.4), color: C.accent},
        {text: '潮汐隆起', x: EARTH.x + SEA + 145, y: 640, show: ramp(t, bulge, bulge + 0.5, out), color: C.accent, anchor: 'start'},
      ]}
    />
  );
}

/** Scene "far": the far side is pulled least, the Earth moves from under its water, and the far bulge rises. */
export function FarDiagram() {
  const t = useTime();
  const away = useCue('far-side', '背向');
  const behind = useCue('far-side', '落在后面');
  const rise = useCue('far-side', '鼓了起来');
  const rel = ramp(t, behind - 0.1, behind + 0.9);
  const shift = 34 * ramp(t, behind - 0.1, behind + 0.8) * (1 - ramp(t, rise + 0.4, rise + 1.4));
  const farUp = ramp(t, behind + 0.2, rise + 1.0);
  return (
    <Diagram
      enter={1}
      arrows={[1, 1, 1]}
      relative={rel}
      near={90}
      far={90 * farUp}
      shift={shift}
      moonAngle={0}
      sun={0}
      sunBulge={0}
      align={0}
      labels={[
        {text: '月球', x: 1560, y: 640, show: 1, color: C.moon},
        {text: '最弱', x: EARTH.x - SEA - 200, y: 470, show: ramp(t, away, away + 0.5, out), color: C.accent},
        {text: '潮汐隆起', x: EARTH.x + SEA + 145, y: 640, show: 1, color: C.accent, anchor: 'start'},
        {text: '另一个隆起', x: EARTH.x - SEA - 120, y: 640, anchor: 'end', show: ramp(t, rise, rise + 0.5, out), color: C.accent},
      ]}
    />
  );
}

/** Scene "sun": the sun's weaker pull, then the moon swings into line and the two bulges add up: a spring tide. */
export function SunDiagram() {
  const t = useTime();
  const sunIn = useCue('sun-pull', '太阳');
  const half = useCue('sun-pull', '不到');
  const line = useCue('sun-spring', '连成一线');
  const add = useCue('sun-spring', '叠加');
  const spring = useCue('sun-spring', '潮差');
  const sun = ramp(t, sunIn - 0.2, sunIn + 0.6, out);
  // The moon starts off the line (a neap tide) and swings onto it as the line is said.
  const swing = ramp(t, line - 0.3, line + 1.0);
  const moonAngle = -0.7 * (1 - swing);
  const sum = ramp(t, add, add + 1.0);
  return (
    <>
      <Diagram
        enter={interpolate(t, [0, 0.5], [0, 1], {easing: out, clamp: true})}
        arrows={[0, 0, 0]}
        relative={0}
        near={90 + 40 * sum}
        far={90 + 40 * sum}
        shift={0}
        moonAngle={moonAngle}
        sun={sun}
        sunBulge={42 * sun * (1 - swing)}
        align={swing}
        labels={[
          {text: '太阳', x: 150, y: 700, show: sun, color: C.sun},
          {text: '大潮', x: EARTH.x + SEA + 160, y: 460, anchor: 'start', show: ramp(t, spring, spring + 0.5, out), color: C.accent, size: T.head},
        ]}
      />
      <Ratio show={ramp(t, half - 0.3, half + 0.3, out) * (1 - ramp(t, line - 0.4, line + 0.2))} fill={ramp(t, half - 0.2, half + 0.8, Easing.outQuart)} />
    </>
  );
}

/** Two bars: the moon's tide-raising force and the sun's, about 46 percent of it (NOAA). */
function Ratio({show, fill}: {show: number; fill: number}) {
  const x = 1180;
  const y = 690;
  const w = 420;
  const rows = [
    {name: '月球', value: 1, color: C.moon},
    {name: '太阳', value: 0.46, color: C.sun},
  ];
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 640, opacity: show, font: `400 ${T.small}px/1 ${FONT.body}`, color: C.ink}}>
      {rows.map((r) => (
        <div key={r.name} style={{display: 'flex', alignItems: 'center', gap: 20, height: 56}}>
          <span style={{width: 90, flexShrink: 0}}>{r.name}</span>
          <div style={{height: 26, width: Math.max(2, Math.round(w * r.value * fill)), background: r.color, borderRadius: 13}} />
          <span style={{color: r.color}}>{r.value === 1 ? `${Math.round(100 * fill)}%` : `约 ${Math.round(46 * fill)}%`}</span>
        </div>
      ))}
      <div style={{font: `400 ${T.small}px/1.4 ${FONT.body}`, color: C.dim, marginTop: 6}}>潮汐力之比 · 来源 NOAA</div>
    </div>
  );
}
