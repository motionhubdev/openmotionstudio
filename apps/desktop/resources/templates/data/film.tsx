import { Film, Scene, Layer, Line, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a statistics office's chart on a dark slate. Ground #0E1A2B, ink #EAF0F7, one accent #5CC8A1 for the latest
// figure, the rest #6B7A90; Inter with tabular figures, so a counting number never shifts.
const C = { ground: '#0E1A2B', ink: '#EAF0F7', accent: '#5CC8A1', dim: '#6B7A90', rail: '#1B2A40' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } as const;

/**
 * The years in which the world reached each billion people, as the United Nations gives them (World Population
 * Prospects 2022; 8 billion on 15 November 2022). Each gap is the years between one billion and the next.
 */
const BILLIONS = [1804, 1927, 1960, 1974, 1987, 1999, 2011, 2022];
const GAPS = BILLIONS.slice(1).map((year, i) => ({ from: i + 1, to: i + 2, years: year - BILLIONS[i]! }));
const LONGEST = Math.max(...GAPS.map((gap) => gap.years));

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

/** The source, on screen for the whole film. */
function Source() {
  return (
    <p style={{ ...type, fontSize: 32, color: C.dim, letterSpacing: 1 }}>Source: United Nations, World Population Prospects 2022</p>
  );
}

/** The cover: the question, and eight marks for the eight billions, in place from the first frame. */
function Question() {
  const t = useTime();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 600, letterSpacing: 6, color: C.accent, marginBottom: 36 }}>1804 — 2022</p>
      <h1 style={{ ...type, fontSize: 132, fontWeight: 800, letterSpacing: -4, maxWidth: 1500 }}>How long does it take to add a billion people?</h1>
      <div style={{ display: 'flex', gap: 28, marginTop: 72 }}>
        {BILLIONS.map((year, i) => {
          const lit = ease(t, 0.6 + i * 0.12, 0.9 + i * 0.12);
          return <div key={year} style={{ width: 56, height: 56, borderRadius: 28, background: i === 7 ? C.accent : C.ink, opacity: 0.25 + 0.75 * lit }} />;
        })}
      </div>
    </div>
  );
}

/** Each gap as a bar, grown and counted to its real number of years, one after another. */
function Gaps() {
  const t = useTime();
  const enter = ease(t, 0, 0.4);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: C.ink, opacity: enter }}>
      <p style={{ ...type, fontSize: 48, fontWeight: 600, marginBottom: 12 }}>Years to add each billion</p>
      {GAPS.map((gap, i) => {
        const grow = ease(t, 0.3 + i * 0.22, 1.1 + i * 0.22, 0, 1, Easing.outQuart);
        const latest = i === GAPS.length - 1;
        const width = Math.max(4, Math.round((gap.years / LONGEST) * 1180 * grow));
        return (
          <div key={gap.to} style={{ display: 'flex', alignItems: 'center', height: 64 }}>
            <span style={{ ...type, fontSize: 40, width: 220, color: C.dim }}>
              {gap.from} → {gap.to} bn
            </span>
            <div style={{ height: 48, width, borderRadius: 6, background: latest ? C.accent : C.ink, opacity: latest ? 1 : 0.85 }} />
            <span style={{ ...type, fontSize: 40, fontWeight: 700, marginLeft: 24, color: latest ? C.accent : C.ink }}>
              {Math.round(gap.years * grow)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The latest billion, as the figure to keep. */
function Latest() {
  const t = useTime();
  const rise = ease(t, 0, 0.5);
  const count = Math.round(ease(t, 0.1, 1.0, 0, GAPS.at(-1)!.years, Easing.outQuart));
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 80, color: C.ink, opacity: rise }}>
      <div style={{ ...type, fontSize: 480, fontWeight: 800, letterSpacing: -20, color: C.accent, width: 600, textAlign: 'right' }}>{count}</div>
      <div>
        <p style={{ ...type, fontSize: 120, fontWeight: 700 }}>years</p>
        <p style={{ ...type, fontSize: 48, color: C.dim, marginTop: 32, maxWidth: 820, lineHeight: 1.3 }}>
          from 7 to 8 billion people, 2011 to 2022. Going from 1 to 2 billion took 123.
        </p>
      </div>
    </div>
  );
}

export default function Main() {
  return (
    <Film>
      <Layer id="ground">
        <Ground />
      </Layer>
      <Layer id="source" x={160} y={980} w={1600} h={50}>
        <Source />
      </Layer>
      <Scene id="question" duration={2.4}>
        <Line id="question-line">How long does it take to add a billion people?</Line>
        <Layer id="question-title" x={160} y={160} w={1600} h={760}>
          <Question />
        </Layer>
      </Scene>
      <Scene id="gaps" duration={4.2}>
        <Line id="gaps-line">From one billion to two took 123 years. Each billion since has come faster.</Line>
        <Layer id="gap-chart" x={160} y={120} w={1600} h={800}>
          <Gaps />
        </Layer>
      </Scene>
      <Scene id="latest" duration={2.4}>
        <Line id="latest-line">The eighth billion took eleven years.</Line>
        <Layer id="latest-figure" x={160} y={160} w={1600} h={760}>
          <Latest />
        </Layer>
      </Scene>
    </Film>
  );
}
