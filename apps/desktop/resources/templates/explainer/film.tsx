import { Film, Scene, Layer, Line, Sound, MotionScope, useTime, interpolate, Easing, seededRandom } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a physics notebook after the rain. Ground #121A26, ink #EEF2F8, the beam white, each colour of the spectrum
// its own; Inter. It opens and closes on the sky; between, one drop, the steps on the left, the drop on the right,
// the caption below both. The narration is in voice/ (voice/credits.txt says how it was made); the bed ducks under it.
const C = { ground: '#121A26', ink: '#EEF2F8', dim: '#5C6B80', drop: '#1E2B3D', rim: '#3A5272', sky: '#1B2738', far: '#24334A', land: '#0E151F', sun: '#FFD27A', cloud: '#3A4A62' };
const SPECTRUM = ['#FF5A4E', '#FF9F43', '#FFD84D', '#5BD68A', '#4DA3FF', '#9B7BFF'];
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1 } as const;
const caption = {
  caption: { font: "'Inter', sans-serif", size: 52, weight: 600, color: C.ink, background: 'rgba(18, 26, 38, 0.85)', radius: 12, 'padding-y': 14, 'padding-x': 28, bottom: 64 },
};

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.inOutCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

// ——— The drop ———

/** The drop, in the diagram's own pixels, and where the beam strikes it: 0.86 of its radius above its centre, where
 * the light that leaves it bunches up (the angle of least turning). */
const DROP = { x: 600, y: 330, r: 270 };
const STRIKE = 0.86 * DROP.r;

type Point = { x: number; y: number };
const along = (p: Point, d: Point, s: number): Point => ({ x: p.x + d.x * s, y: p.y + d.y * s });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const normal = (p: Point): Point => ({ x: (p.x - DROP.x) / DROP.r, y: (p.y - DROP.y) / DROP.r });
/** Where a ray from a point on the drop's rim leaves it again. */
const across = (p: Point, d: Point): Point => along(p, d, -2 * dot({ x: p.x - DROP.x, y: p.y - DROP.y }, d));
/** A ray bent through a surface (normal facing it), going from index n1 to n2 (`ratio` = n1 / n2). */
function refract(d: Point, n: Point, ratio: number): Point {
  const cos = -dot(n, d);
  const k = Math.sqrt(1 - ratio * ratio * (1 - cos * cos));
  return { x: ratio * d.x + (ratio * cos - k) * n.x, y: ratio * d.y + (ratio * cos - k) * n.y };
}

/**
 * One colour's path through the drop, traced: in, bent, reflected off the back, bent again on the way out. Red is
 * traced with water's real index for red light, 1.331, so the angle it leaves at is the real one; the others are
 * spread wider than water spreads them (violet's real index is 1.343), so they can be seen apart.
 */
function trace(index: number) {
  const n = 1.331 + index * 0.02;
  const enter: Point = { x: DROP.x - Math.sqrt(DROP.r ** 2 - STRIKE ** 2), y: DROP.y - STRIKE };
  const inside = refract({ x: 1, y: 0 }, normal(enter), 1 / n);
  const back = across(enter, inside);
  const nb = normal(back);
  const reflected = { x: inside.x - 2 * dot(inside, nb) * nb.x, y: inside.y - 2 * dot(inside, nb) * nb.y };
  const exit = across(back, reflected);
  const ne = normal(exit);
  const out = refract(reflected, { x: -ne.x, y: -ne.y }, n);
  return { enter, back, exit, out, end: along(exit, out, 300) };
}
const PATHS = SPECTRUM.map((_, i) => trace(i));
/** The angle, in degrees, between red light leaving the drop and the sunlight's own line back: about 42. */
const RED = PATHS[0]!;
const ANGLE = Math.round((Math.acos(-RED.out.x) * 180) / Math.PI);

/** A segment drawn from its start as `draw` runs from 0 to 1. */
function Segment({ from, to, draw, color, width, dash }: { from: Point; to: Point; draw: number; color: string; width: number; dash?: string }) {
  if (draw <= 0) return null;
  const end = { x: from.x + (to.x - from.x) * draw, y: from.y + (to.y - from.y) * draw };
  return <line x1={from.x} y1={from.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />;
}

/** The drop and the light through it: `beam`, `split`, `bounce`, `leave` and `angle` each draw their part, 0 to 1. */
function Drop({ beam, split, bounce, leave, angle }: { beam: number; split: number; bounce: number; leave: number; angle: number }) {
  const { enter } = RED;
  const arc = 120;
  const back = { x: -1, y: 0 };
  const a0 = Math.atan2(back.y, back.x);
  const a1 = Math.atan2(RED.out.y, RED.out.x);
  const sweep = a0 + (a1 - a0) * angle;
  const arcPath = `M ${RED.exit.x + Math.cos(a0) * arc} ${RED.exit.y + Math.sin(a0) * arc} A ${arc} ${arc} 0 0 0 ${RED.exit.x + Math.cos(sweep) * arc} ${RED.exit.y + Math.sin(sweep) * arc}`;
  return (
    <svg width={1100} height={860} viewBox="0 0 1100 860" style={{ overflow: 'visible' }}>
      <circle cx={DROP.x} cy={DROP.y} r={DROP.r} fill={C.drop} stroke={C.rim} strokeWidth={4} />
      <Segment from={{ x: -40, y: enter.y }} to={enter} draw={beam} color="#FFFFFF" width={12} />
      {PATHS.map((path, i) => (
        <g key={i}>
          <Segment from={path.enter} to={path.back} draw={split} color={SPECTRUM[i]!} width={5} />
          <Segment from={path.back} to={path.exit} draw={bounce} color={SPECTRUM[i]!} width={5} />
          <Segment from={path.exit} to={path.end} draw={leave} color={SPECTRUM[i]!} width={8} />
        </g>
      ))}
      {angle > 0 && (
        <g opacity={Math.min(1, angle * 2)}>
          <Segment from={RED.exit} to={along(RED.exit, back, 300)} draw={1} color={C.dim} width={4} dash="10 14" />
          <path d={arcPath} fill="none" stroke={C.ink} strokeWidth={4} />
          <text x={RED.exit.x - arc - 30} y={RED.exit.y + 70} textAnchor="end" fill={C.ink} style={{ ...type, fontSize: 64, fontWeight: 800 }}>
            {Math.round(ANGLE * angle)}°
          </text>
        </g>
      )}
    </svg>
  );
}

const STEPS = ['Enter', 'Bend', 'Reflect', 'Leave'];

/** The four steps, the current one lit. */
function Steps({ current }: { current: number }) {
  const t = useTime();
  const lit = ease(t, 0, 0.4);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36, color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 600, letterSpacing: 6, color: C.dim }}>HOW A RAINBOW FORMS</p>
      {STEPS.map((step, i) => {
        const on = i === current ? lit : i === current - 1 ? 1 - lit : 0;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'baseline', gap: 32, opacity: 0.3 + 0.7 * on }}>
            <span style={{ ...type, fontSize: 60, fontWeight: 300, width: 56, color: i === current ? SPECTRUM[[0, 2, 3, 4][i]!] : C.ink }}>{i + 1}</span>
            <span style={{ ...type, fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Each step's drop, carried on from where the step before left it. */
function Diagram({ step }: { step: number }) {
  const t = useTime();
  const now = ease(t, 0.4, 1.6);
  const part = (i: number) => (step === i ? now : step > i ? 1 : 0);
  return <Drop beam={part(0)} split={part(1)} bounce={part(2)} leave={part(3)} angle={step === 3 ? ease(t, 1.4, 2.4) : 0} />;
}

// ——— The sky ———

/** Rain: streaks falling on the right of the sky, from a seeded random, so every frame is the same each time. */
const RAIN = Array.from({ length: 70 }, (_, i) => {
  const random = seededRandom(300 + i);
  return { x: 1000 + random() * 900, y: random() * 700, speed: 900 + random() * 500, length: 30 + random() * 30 };
});

/**
 * The sky: a low sun on the left behind the person looking, rain on the right, and with `bow` (0 to 1), the rainbow
 * drawn across the rain, centred where the person's shadow points, red outside and violet inside.
 */
function Sky({ bow = 0 }: { bow?: number }) {
  const t = useTime();
  const centre = { x: 1260, y: 1000 };
  const bands = SPECTRUM.map((colour, i) => ({ colour, r: 620 - i * 22 }));
  return (
    <svg width={1920} height={1080} style={{ display: 'block', background: C.sky }}>
      <style>{face}</style>
      <rect y={420} width={1920} height={400} fill={C.far} />
      <circle cx={160} cy={560} r={70} fill={C.sun} />
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={i} x1={250} y1={520 + i * 22} x2={420 + ((t * 60 + i * 37) % 60)} y2={520 + i * 22} stroke={C.sun} strokeWidth={4} opacity={0.35} />
      ))}
      <g opacity={0.9}>
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={i} cx={1180 + i * 170} cy={150 + (i % 2) * 30} rx={200} ry={90} fill={C.cloud} />
        ))}
      </g>
      {RAIN.map((drop, i) => {
        const y = 200 + ((drop.y + t * drop.speed) % 620);
        return <line key={i} x1={drop.x} y1={y} x2={drop.x - drop.length * 0.25} y2={y + drop.length} stroke="#8FA6C7" strokeWidth={3} opacity={0.5} />;
      })}
      {bands.map((band, i) => {
        const length = Math.PI * band.r;
        return (
          <path key={i} d={`M ${centre.x - band.r} ${centre.y} A ${band.r} ${band.r} 0 0 1 ${centre.x + band.r} ${centre.y}`} fill="none" stroke={band.colour} strokeWidth={22} opacity={0.85} strokeDasharray={length} strokeDashoffset={length * (1 - bow)} />
        );
      })}
      <rect y={760} width={1920} height={320} fill={C.land} />
      <g transform="translate(520 760)">
        <circle cx={0} cy={-150} r={26} fill={C.ink} />
        <path d="M -26 -118 L 26 -118 L 34 -10 L 12 -10 L 0 -60 L -12 -10 L -34 -10 Z" fill={C.ink} />
        <line x1={0} y1={0} x2={260} y2={40} stroke="#000" strokeWidth={18} opacity={0.35} strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** The opening's title, over the sky. */
function Title() {
  return (
    <div style={{ color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 600, letterSpacing: 6, color: C.sun }}>IN FOUR STEPS</p>
      <h1 style={{ ...type, fontSize: 120, fontWeight: 800, letterSpacing: -4, marginTop: 20 }}>How a rainbow forms</h1>
    </div>
  );
}

/** The close: the arc drawn across the rain, and the closing line over it. */
function Arc() {
  const t = useTime();
  return <Sky bow={ease(t, 0.3, 2.2, 0, 1, Easing.inOutSine)} />;
}
function Closing() {
  const t = useTime();
  return (
    <div style={{ color: C.ink, opacity: ease(t, 1.6, 2.2) }}>
      <h1 style={{ ...type, fontSize: 100, fontWeight: 800, letterSpacing: -3 }}>Millions of drops.</h1>
      <h1 style={{ ...type, fontSize: 100, fontWeight: 800, letterSpacing: -3, color: C.sun }}>One arc.</h1>
    </div>
  );
}

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

const DROP_SCENES = [
  { id: 'enter', duration: 3, line: 'Light enters a raindrop and bends.' },
  { id: 'bend', duration: 3, line: 'Each colour bends a different amount.' },
  { id: 'reflect', duration: 2.8, line: 'It reflects off the back of the drop,' },
  { id: 'leave', duration: 3.4, line: 'and leaves at about forty-two degrees.' },
];

export default function Main() {
  return (
    <MotionScope tokens={caption}>
      <Film captions="words" voice="recording:template">
        <Sound src="media/bed.mp3" volume={-6} duck={10} fadeOut={1.5} />
        <Sound src="media/effects.mp3" volume={-6} />
        <Layer id="ground">
          <Ground />
        </Layer>
        <Scene id="sky" duration={4}>
          <Line id="sky">Every rainbow starts with sunlight and rain.</Line>
          <Layer id="sky-picture">
            <Sky />
          </Layer>
          <Layer id="sky-title" x={140} y={90} w={900} h={260}>
            <Title />
          </Layer>
        </Scene>
        {DROP_SCENES.map((scene, i) => (
          <Scene key={scene.id} id={scene.id} duration={scene.duration}>
            <Line id={scene.id}>{scene.line}</Line>
            <Layer id={`${scene.id}-steps`} x={140} y={60} w={640} h={700}>
              <Steps current={i} />
            </Layer>
            <Layer id={`${scene.id}-drop`} x={820} y={40} w={1100} h={860}>
              <Diagram step={i} />
            </Layer>
          </Scene>
        ))}
        <Scene id="arc" duration={3.8}>
          <Line id="arc">Millions of drops together paint the arc.</Line>
          <Layer id="arc-picture">
            <Arc />
          </Layer>
          <Layer id="arc-title" x={140} y={90} w={900} h={260}>
            <Closing />
          </Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
