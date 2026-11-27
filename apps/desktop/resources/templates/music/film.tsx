import { Film, Scene, Layer, Line, Sound, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a club flyer, one colour a bar. Each bar of media/beat.mp3 (120 beats a minute: a beat every 0.5 s, four
// to a bar, the claps on beats 2 and 4) is a scene of 2 s, so a scene's own time puts every beat at 0, 0.5, 1 and 1.5.
const BEAT = 0.5;
const BARS = [
  { word: 'Cut', ground: '#FF3D6E', ink: '#1A0A12' },
  { word: 'to', ground: '#2D2AFF', ink: '#F4F2FF' },
  { word: 'the', ground: '#FFC62E', ink: '#1F1400' },
  { word: 'beat.', ground: '#111014', ink: '#FF3D6E' },
];
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1 } as const;

/** How far into the current beat the scene is (0 to 1), and which beat of the bar it is (0 to 3). */
function beatOf(t: number) {
  const beat = Math.min(3, Math.floor(t / BEAT));
  return { beat, phase: (t - beat * BEAT) / BEAT };
}
/** A hit that is loudest on the beat and dies away before the next. */
const hit = (phase: number, decay = 6) => Math.exp(-phase * decay);

const centred = { position: 'absolute', left: '50%', top: '50%', borderRadius: '50%', boxSizing: 'border-box', flexShrink: 0 } as const;

/** The bar's colour, with a ring thrown out from the middle on every kick. */
function Pulse({ bar }: { bar: number }) {
  const t = useTime();
  const { phase } = beatOf(t);
  const { ground, ink } = BARS[bar]!;
  const ring = interpolate(phase, [0, 1], [0.35, 1.6], { easing: Easing.outCubic, clamp: true });
  return (
    <div style={{ width: '100%', height: '100%', background: ground, position: 'relative', overflow: 'hidden' }}>
      <style>{face}</style>
      <div style={{ ...centred, width: 640, height: 640, background: ink, opacity: 0.12 * hit(phase, 5), transform: `translate(-50%, -50%) scale(${1 + 0.15 * hit(phase, 5)})` }} />
      <div style={{ ...centred, width: 900, height: 900, border: `28px solid ${ink}`, opacity: 0.4 * (1 - phase), transform: `translate(-50%, -50%) scale(${ring})` }} />
    </div>
  );
}

/** The bar's word, punched on the claps (beats 2 and 4). */
function Word({ bar }: { bar: number }) {
  const t = useTime();
  const { beat, phase } = beatOf(t);
  const clap = beat % 2 === 1 ? hit(phase, 8) : 0;
  const land = bar === 0 ? 1 : interpolate(t, [0, 0.12], [0, 1], { easing: Easing.outBack, clamp: true });
  const { word, ink } = BARS[bar]!;
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <h1 style={{ ...type, fontSize: 420, fontWeight: 900, letterSpacing: -16, color: ink, transform: `scale(${(0.7 + 0.3 * land) * (1 + 0.08 * clap)}) rotate(${(beat % 2 ? -1 : 1) * 2 * clap}deg)` }}>
        {word}
      </h1>
    </div>
  );
}

/** Four marks, one a beat, lit as the beat comes round. */
function Count({ bar }: { bar: number }) {
  const t = useTime();
  const { beat, phase } = beatOf(t);
  const { ink } = BARS[bar]!;
  return (
    <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36 }}>
      {[0, 1, 2, 3].map((i) => {
        const on = i < beat ? 1 : i === beat ? 0.6 + 0.4 * hit(phase, 4) : 0;
        return <div key={i} style={{ width: 120, height: 20, borderRadius: 10, background: ink, opacity: 0.2 + 0.8 * on, transform: `scaleY(${1 + (i === beat ? hit(phase, 8) : 0)})` }} />;
      })}
    </div>
  );
}

export default function Main() {
  return (
    <Film>
      <Sound src="media/beat.mp3" volume={-2} fadeOut={0.5} />
      {BARS.map((bar, i) => (
        <Scene key={bar.word} id={`bar-${i + 1}`} duration={BEAT * 4}>
          <Line id={`bar-${i + 1}-line`}>{bar.word}</Line>
          <Layer id={`bar-${i + 1}-pulse`}>
            <Pulse bar={i} />
          </Layer>
          <Layer id={`bar-${i + 1}-word`} x={160} y={200} w={1600} h={560} z={1}>
            <Word bar={i} />
          </Layer>
          <Layer id={`bar-${i + 1}-count`} x={660} y={840} w={600} h={80} z={1}>
            <Count bar={i} />
          </Layer>
        </Scene>
      ))}
    </Film>
  );
}
