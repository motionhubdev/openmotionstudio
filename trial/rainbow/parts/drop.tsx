import {useTime} from '@motionhub/runtime';
import {C, SPECTRUM, T, Label, ease, arrowHead} from './kit';

const CX = 560, CY = 470, R = 330;
const I = (59.5 * Math.PI) / 180; // the angle the sunlight meets the drop at, where red is brightest
/** Refractive index from red to violet. The real spread (1.331 to 1.343) is about 2°; it is widened here to be seen. */
const N = SPECTRUM.map((_, k) => 1.331 + (k / (SPECTRUM.length - 1)) * 0.05);

const at = (theta: number) => ({x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta)});

/** The path of one colour through the drop: in, across to the back, reflected, out (screen coordinates). */
function pathFor(n: number) {
  const r = Math.asin(Math.sin(I) / n);
  const step = Math.PI - 2 * r;
  const t1 = Math.PI - I, t2 = t1 - step, t3 = t2 - step;
  const deviation = Math.PI + 2 * I - 4 * r;
  const out = Math.PI + (Math.PI - deviation); // direction leaving, measured y-up
  return {p1: at(t1), p2: at(t2), p3: at(t3), dir: {x: Math.cos(out), y: -Math.sin(out)}};
}

const PATHS = N.map(pathFor);
const P1 = PATHS[0]!.p1;

function seg(a: {x: number; y: number}, b: {x: number; y: number}, k: number) {
  return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k};
}

/** One raindrop, large: sunlight enters, bends, reflects off the back, bends again and leaves as colours. */
export function DropPicture() {
  const t = useTime();
  const enter = ease(t, [0, 0.5], [0, 1]);
  const inRay = ease(t, [0.3, 1.2], [0, 1]);
  const across = ease(t, [1.2, 2.1], [0, 1]);
  const back = ease(t, [2.9, 3.9], [0, 1]);
  const out = ease(t, [5.5, 6.7], [0, 1]);
  const label1 = ease(t, [1.4, 1.9], [0, 1]);
  const label2 = ease(t, [3.5, 4.0], [0, 1]);
  const label3 = ease(t, [6.0, 6.5], [0, 1]);
  const start = {x: -20, y: P1.y};
  const rayIn = seg(start, P1, inRay);
  const OUT_LEN = 300;
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 1040" style={{opacity: enter}}>
      <defs>
        <radialGradient id="drop-fill" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3D5A78" />
          <stop offset="100%" stopColor="#22344A" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={R} fill="url(#drop-fill)" stroke={C.drop} strokeWidth={5} />
      {/* sunlight, waiting at the left from the first frame */}
      <line x1={start.x} y1={P1.y} x2={140} y2={P1.y} stroke={C.sun} strokeWidth={8} strokeLinecap="round" opacity={0.35} />
      <Label x={20} y={P1.y - 56} color={C.sun} anchor="start">阳光</Label>
      <line x1={start.x} y1={start.y} x2={rayIn.x} y2={rayIn.y} stroke={C.sun} strokeWidth={8} strokeLinecap="round" />
      {PATHS.map((p, k) => {
        const a = seg(p.p1, p.p2, across);
        const b = seg(p.p2, p.p3, back);
        const end = {x: p.p3.x + p.dir.x * OUT_LEN * out, y: p.p3.y + p.dir.y * OUT_LEN * out};
        return (
          <g key={k} stroke={SPECTRUM[k]} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.95}>
            {across > 0 && <line x1={p.p1.x} y1={p.p1.y} x2={a.x} y2={a.y} />}
            {back > 0 && <line x1={p.p2.x} y1={p.p2.y} x2={b.x} y2={b.y} />}
            {out > 0 && <line x1={p.p3.x} y1={p.p3.y} x2={end.x} y2={end.y} strokeWidth={6} />}
            {out > 0.98 && <path d={arrowHead(end.x, end.y, p.dir.x, p.dir.y, 24)} fill={SPECTRUM[k]} stroke="none" />}
          </g>
        );
      })}
      <g opacity={label1}>
        <circle cx={P1.x} cy={P1.y} r={10} fill={C.ink} />
        <Label x={P1.x - 30} y={P1.y - 70} anchor="end" weight={700}>① 折射</Label>
      </g>
      <g opacity={label2}>
        <circle cx={PATHS[3]!.p2.x} cy={PATHS[3]!.p2.y} r={10} fill={C.ink} />
        <Label x={PATHS[3]!.p2.x - 90} y={PATHS[3]!.p2.y + 120} anchor="end" weight={700}>② 反射</Label>
      </g>
      <g opacity={label3}>
        <circle cx={PATHS[3]!.p3.x} cy={PATHS[3]!.p3.y} r={10} fill={C.ink} />
        <Label x={PATHS[3]!.p3.x + 60} y={PATHS[3]!.p3.y + 70} anchor="start" weight={700}>③ 再折射</Label>
      </g>
      <Label x={980} y={1010} anchor="end" color={C.dim} size={T.small} opacity={label3}>示意图：颜色的分开已放大</Label>
    </svg>
  );
}
