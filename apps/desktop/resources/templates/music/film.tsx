import { Film, Scene, Layer, Line, Sound, useTime, useCompositionTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a club flyer that changes with the track. media/beat.mp3 is 120 beats a minute: a beat every 0.5 s, a bar
// every 2 s, ten bars in five parts of two bars each, and every scene is one part, so a scene's own time puts its
// beats at 0, 0.5, 1 … The picture moves on the beat: rings on the kicks, the word on the claps (beats 2 and 4).
const BEAT = 0.5;
const BAR = 4 * BEAT;
const C = { pink: '#FF3D6E', blue: '#2D2AFF', yellow: '#FFC62E', black: '#111014', paper: '#F4F2FF', ink: '#1A0A12' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1 } as const;

/** How far into the beat (0 to 1) and which beat of the bar (0 to 3). */
const beatOf = (t: number) => ({ beat: Math.floor(t / BEAT) % 4, phase: (t % BEAT) / BEAT });
/** A hit that is loudest on the beat and dies away before the next. */
const hit = (phase: number, decay = 6) => Math.exp(-phase * decay);
const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });
const centred = { position: 'absolute', left: '50%', top: '50%', borderRadius: '50%', boxSizing: 'border-box' } as const;

/** A ring thrown out from the middle on every kick, and a disc that swells with it. */
function Rings({ ink, from = 0 }: { ink: string; from?: number }) {
  const t = useTime();
  if (t < from) return null;
  const { phase } = beatOf(t);
  const ring = interpolate(phase, [0, 1], [0.35, 1.7], { easing: Easing.outCubic, clamp: true });
  return (
    <>
      <div style={{ ...centred, width: 640, height: 640, background: ink, opacity: 0.12 * hit(phase, 5), transform: `translate(-50%, -50%) scale(${1 + 0.15 * hit(phase, 5)})` }} />
      <div style={{ ...centred, width: 900, height: 900, border: `28px solid ${ink}`, opacity: 0.4 * (1 - phase), transform: `translate(-50%, -50%) scale(${ring})` }} />
    </>
  );
}

/** The word, punched on the claps. */
function Word({ word, ink, size = 420, still = false }: { word: string; ink: string; size?: number; still?: boolean }) {
  const t = useTime();
  const { beat, phase } = beatOf(t);
  const clap = beat % 2 === 1 ? hit(phase, 8) : 0;
  const land = still ? 1 : ease(t, 0, 0.12, 0, 1, Easing.outBack);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
      <h1 style={{ ...type, fontSize: size, fontWeight: 900, letterSpacing: -size / 26, color: ink, whiteSpace: 'nowrap', transform: `scale(${(0.7 + 0.3 * land) * (1 + 0.08 * clap)}) rotate(${(beat % 2 ? -1 : 1) * 2 * clap}deg)` }}>
        {word}
      </h1>
    </div>
  );
}

/** The intro: the first colour, its rings, and the first word. */
function Intro() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.pink, overflow: 'hidden' }}>
      <Rings ink={C.ink} from={0} />
      <Word word="Cut" ink={C.ink} still />
    </div>
  );
}

/** The build: a grid of squares turned over an eighth at a time, faster and fuller into the drop. */
function Build() {
  const t = useTime();
  const eighth = Math.floor(t / (BEAT / 2));
  const cells = Array.from({ length: 6 * 10 }, (_, i) => i);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.blue, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: '80px 80px 220px', display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 24 }}>
        {cells.map((i) => {
          // Each eighth lights a diagonal; from bar two, two of them.
          const lit = (i % 10) + Math.floor(i / 10) === eighth % 16 || (t >= BAR && (i % 10) - Math.floor(i / 10) + 6 === eighth % 16);
          return <div key={i} style={{ borderRadius: 18, background: lit ? C.yellow : C.paper, opacity: lit ? 1 : 0.1, transform: `scale(${lit ? 1 : 0.6})` }} />;
        })}
      </div>
      <Word word="to" ink={C.paper} />
    </div>
  );
}

/** The drop: a word a beat, each on its own colour, the rings under it. */
const DROP = [
  { word: 'CUT', ground: C.yellow, ink: C.ink },
  { word: 'TO', ground: C.black, ink: C.pink },
  { word: 'THE', ground: C.pink, ink: C.ink },
  { word: 'BEAT', ground: C.blue, ink: C.paper },
];
function Drop() {
  const t = useTime();
  const { beat } = beatOf(t);
  const { word, ground, ink } = DROP[beat]!;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: ground, overflow: 'hidden' }}>
      <Rings ink={ink} />
      <Word key={Math.floor(t / BEAT)} word={word} ink={ink} size={480} still />
    </div>
  );
}

/** The breakdown: the drums drop out, and one line traces the pad's swell, then rises with the riser. */
function Breakdown() {
  const t = useTime();
  const rise = ease(t, 2.6, 4, 0, 1, Easing.inCubic);
  const points = Array.from({ length: 97 }, (_, i) => {
    const x = i * 20;
    const y = 540 + Math.sin(i * 0.22 - t * 3) * (90 + 160 * rise) * Math.sin((i / 96) * Math.PI);
    return `${x},${Math.round(y)}`;
  }).join(' ');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: C.black, overflow: 'hidden' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <polyline points={points} fill="none" stroke={C.pink} strokeWidth={10} strokeLinecap="round" opacity={ease(t, 0, 0.6)} />
      </svg>
      <p style={{ ...type, position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontSize: 96, fontWeight: 300, color: C.paper, opacity: ease(t, 0.3, 1) * (1 - rise) }}>breathe in</p>
    </div>
  );
}

/** The outro: everything at once, then the whole line on the last chord. */
function Outro() {
  const t = useTime();
  const whole = ease(t, 2, 2.3, 0, 1, Easing.outBack);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: t < 2 ? C.pink : C.black, overflow: 'hidden' }}>
      {t < 2 ? (
        <>
          <Rings ink={C.ink} />
          <Word word="BEAT" ink={C.ink} size={480} still />
        </>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <h1 style={{ ...type, fontSize: 210, fontWeight: 900, letterSpacing: -8, color: C.paper, transform: `scale(${0.8 + 0.2 * whole})`, opacity: whole > 0 ? 1 : 0 }}>
            Cut to the <span style={{ color: C.pink }}>beat.</span>
          </h1>
        </div>
      )}
    </div>
  );
}

/** Across the film: four marks for the bar's beats, and which bar of ten it is. */
function Count() {
  const t = useCompositionTime();
  const { beat, phase } = beatOf(t);
  const bar = Math.min(10, Math.floor(t / BAR) + 1);
  const ending = t >= 18;
  return (
    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36, mixBlendMode: 'difference' }}>
      <style>{face}</style>
      {[0, 1, 2, 3].map((i) => {
        const on = ending ? 1 : i < beat ? 1 : i === beat ? 0.6 + 0.4 * hit(phase, 4) : 0;
        return <div key={i} style={{ width: 120, height: 20, borderRadius: 10, background: '#FFFFFF', opacity: 0.25 + 0.75 * on }} />;
      })}
      <span style={{ ...type, fontSize: 40, fontWeight: 700, color: '#FFFFFF', width: 150, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{bar} / 10</span>
    </div>
  );
}

const PARTS = [
  { id: 'intro', line: 'Cut', draw: <Intro /> },
  { id: 'build', line: 'to', draw: <Build /> },
  { id: 'drop', line: 'Cut to the beat.', draw: <Drop /> },
  { id: 'breakdown', line: 'Breathe in.', draw: <Breakdown /> },
  { id: 'outro', line: 'Cut to the beat.', draw: <Outro /> },
];

export default function Main() {
  return (
    <Film>
      <Sound src="media/beat.mp3" fadeOut={0.5} />
      {PARTS.map((part) => (
        <Scene key={part.id} id={part.id} duration={2 * BAR}>
          <Line id={`${part.id}-line`}>{part.line}</Line>
          <Layer id={`${part.id}-picture`}>{part.draw}</Layer>
        </Scene>
      ))}
      <Layer id="beat-count" x={560} y={900} w={800} h={80} z={1}>
        <Count />
      </Layer>
    </Film>
  );
}
