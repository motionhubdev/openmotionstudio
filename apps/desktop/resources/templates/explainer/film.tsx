import { Film, Scene, Layer, Line, MotionScope, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a physics notebook after the rain. Ground #121A26, ink #EEF2F8, the beam white, each colour of the spectrum
// its own; Inter. The steps sit on the left, the drop on the right, the caption below both.
const C = { ground: '#121A26', ink: '#EEF2F8', dim: '#5C6B80', drop: '#1E2B3D', rim: '#3A5272' };
const SPECTRUM = ['#FF5A4E', '#FF9F43', '#FFD84D', '#5BD68A', '#4DA3FF', '#9B7BFF'];
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1 } as const;
const caption = {
  caption: { font: "'Inter', sans-serif", size: 52, weight: 600, color: C.ink, background: 'rgba(18, 26, 38, 0.85)', radius: 12, 'padding-y': 14, 'padding-x': 28, bottom: 64 },
};

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.inOutCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

/** The drop, in the diagram's own pixels, and where the beam strikes it (above its centre). */
const DROP = { x: 600, y: 330, r: 270 };
const STRIKE = 0.86 * DROP.r;

type Point = { x: number; y: number };
const along = (p: Point, d: Point, s: number): Point => ({ x: p.x + d.x * s, y: p.y + d.y * s });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const normal = (p: Point): Point => ({ x: (p.x - DROP.x) / DROP.r, y: (p.y - DROP.y) / DROP.r });
/** Where a ray from a point on the drop's rim leaves it again. */
const across = (p: Point, d: Point): Point => along(p, d, -2 * dot({ x: p.x - DROP.x, y: p.y - DROP.y }, d));
/** A ray bent through a surface (normal facing it), going from index n1 to n2. */
function refract(d: Point, n: Point, ratio: number): Point {
  const cos = -dot(n, d);
  const k = Math.sqrt(1 - ratio * ratio * (1 - cos * cos));
  return { x: ratio * d.x + (ratio * cos - k) * n.x, y: ratio * d.y + (ratio * cos - k) * n.y };
}

/**
 * One colour's path through the drop, traced: in, bent, reflected off the back, bent again on the way out. Water's
 * index runs from about 1.331 for red to 1.343 for violet; the spread is drawn wider than that, so it can be seen.
 */
function trace(index: number) {
  const n = 1.3 + index * 0.024;
  const enter: Point = { x: DROP.x - Math.sqrt(DROP.r ** 2 - STRIKE ** 2), y: DROP.y - STRIKE };
  const inside = refract({ x: 1, y: 0 }, normal(enter), 1 / n);
  const back = across(enter, inside);
  const nb = normal(back);
  const reflected = { x: inside.x - 2 * dot(inside, nb) * nb.x, y: inside.y - 2 * dot(inside, nb) * nb.y };
  const exit = across(back, reflected);
  const ne = normal(exit);
  const out = refract(reflected, { x: -ne.x, y: -ne.y }, n);
  return { enter, back, exit, end: along(exit, out, 280) };
}
const PATHS = SPECTRUM.map((_, i) => trace(i));

/** A segment drawn from its start as `draw` runs from 0 to 1. */
function Segment({ from, to, draw, color, width }: { from: Point; to: Point; draw: number; color: string; width: number }) {
  if (draw <= 0) return null;
  const end = { x: from.x + (to.x - from.x) * draw, y: from.y + (to.y - from.y) * draw };
  return <line x1={from.x} y1={from.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

/** The drop and the light through it: `beam`, `split` and `fan` each draw their part, 0 to 1. */
function Drop({ beam, split, fan }: { beam: number; split: number; fan: number }) {
  const { enter } = PATHS[0]!;
  return (
    <svg width={1100} height={860} viewBox="0 0 1100 860" style={{ overflow: 'visible' }}>
      <circle cx={DROP.x} cy={DROP.y} r={DROP.r} fill={C.drop} stroke={C.rim} strokeWidth={4} />
      <Segment from={{ x: -40, y: enter.y }} to={enter} draw={beam} color="#FFFFFF" width={12} />
      {PATHS.map((path, i) => (
        <g key={i} opacity={0.95}>
          <Segment from={path.enter} to={path.back} draw={split} color={SPECTRUM[i]!} width={5} />
          <Segment from={path.back} to={path.exit} draw={ease(fan, 0, 0.45)} color={SPECTRUM[i]!} width={5} />
          <Segment from={path.exit} to={path.end} draw={ease(fan, 0.45, 1)} color={SPECTRUM[i]!} width={8} />
        </g>
      ))}
    </svg>
  );
}

const STEPS = ['Enter', 'Bend', 'Reflect'];

/** The three steps, the current one lit. */
function Steps({ current }: { current: number }) {
  const t = useTime();
  const lit = ease(t, 0, 0.4);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 44, color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 600, letterSpacing: 6, color: C.dim }}>HOW A RAINBOW FORMS</p>
      {STEPS.map((step, i) => {
        const on = i === current ? lit : i === current - 1 ? 1 - lit : 0;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'baseline', gap: 32, opacity: 0.3 + 0.7 * on }}>
            <span style={{ ...type, fontSize: 64, fontWeight: 300, width: 56, color: i === current ? SPECTRUM[i * 2] : C.ink }}>{i + 1}</span>
            <span style={{ ...type, fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Each scene's drop, carried on from where the scene before left it. */
function Diagram({ step }: { step: number }) {
  const t = useTime();
  const now = ease(t, 0.4, 1.6);
  return <Drop beam={step === 0 ? now : 1} split={step === 1 ? now : step > 1 ? 1 : 0} fan={step === 2 ? ease(t, 0.4, 2.2) : 0} />;
}

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

export default function Main() {
  return (
    <MotionScope tokens={caption}>
      <Film captions="words" voice="recording:template">
        <Layer id="ground">
          <Ground />
        </Layer>
        {[
          { id: 'enter', duration: 3, line: 'Sunlight enters a raindrop.' },
          { id: 'bend', duration: 3.2, line: 'Each colour bends a different amount.' },
          { id: 'fan', duration: 3.8, line: 'It reflects, and the colours fan out.' },
        ].map((scene, i) => (
          <Scene key={scene.id} id={scene.id} duration={scene.duration}>
            <Line id={scene.id}>{scene.line}</Line>
            <Layer id={`${scene.id}-steps`} x={140} y={60} w={640} h={640}>
              <Steps current={i} />
            </Layer>
            <Layer id={`${scene.id}-drop`} x={820} y={40} w={1100} h={860}>
              <Diagram step={i} />
            </Layer>
          </Scene>
        ))}
      </Film>
    </MotionScope>
  );
}
