import { Film, Scene, Layer, Line, Sound, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a statistics office's chart on a dark slate. Ground #0E1A2B, ink #EAF0F7, one accent #5CC8A1 for the latest
// and the next, the rest #6B7A90; Inter with tabular figures, so a counting number never shifts.
const C = { ground: '#0E1A2B', ink: '#EAF0F7', accent: '#5CC8A1', dim: '#6B7A90', rail: '#22334D' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } as const;

/**
 * The United Nations' figures (World Population Prospects 2022): the years in which the world reached each billion
 * people (8 billion on 15 November 2022), and its projection: about 8.5 billion in 2030, 9.7 billion in 2050, and a
 * peak of about 10.4 billion during the 2080s, held to 2100.
 */
const BILLIONS = [1804, 1927, 1960, 1974, 1987, 1999, 2011, 2022];
const PROJECTION = [
  { year: 2022, people: 8 },
  { year: 2030, people: 8.5 },
  { year: 2050, people: 9.7 },
  { year: 2085, people: 10.4 },
  { year: 2100, people: 10.4 },
];
const GAPS = BILLIONS.slice(1).map((year, i) => ({ from: i + 1, to: i + 2, years: year - BILLIONS[i]! }));
const LONGEST = Math.max(...GAPS.map((gap) => gap.years));
/** When each scene starts, in seconds into the film. */
const AT = { question: 0, curve: 3, gaps: 7.6, latest: 12.4, next: 15.4, end: 20 };

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

function Source() {
  return <p style={{ ...type, fontSize: 32, color: C.dim, letterSpacing: 1 }}>Source: United Nations, World Population Prospects 2022</p>;
}

/** The cover: the question, and eight marks for the eight billions. */
function Question() {
  const t = useTime();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 600, letterSpacing: 6, color: C.accent, marginBottom: 36 }}>1804 — 2022</p>
      <h1 style={{ ...type, fontSize: 132, fontWeight: 800, letterSpacing: -4, maxWidth: 1500 }}>How long does it take to add a billion people?</h1>
      <div style={{ display: 'flex', gap: 28, marginTop: 72 }}>
        {BILLIONS.map((year, i) => {
          const lit = ease(t, 0.8 + i * 0.15, 1.1 + i * 0.15);
          return <div key={year} style={{ width: 56, height: 56, borderRadius: 28, background: i === 7 ? C.accent : C.ink, opacity: 0.25 + 0.75 * lit, transform: `scale(${0.8 + 0.2 * lit})` }} />;
        })}
      </div>
    </div>
  );
}

/** The chart's frame: years 1800 to 2100 across, 0 to 11 billion up, in the layer's own pixels. */
const CHART = { w: 1600, h: 640, left: 90, right: 40, top: 30, bottom: 70 };
const x = (year: number) => CHART.left + ((year - 1800) / 300) * (CHART.w - CHART.left - CHART.right);
const y = (people: number) => CHART.h - CHART.bottom - (people / 11) * (CHART.h - CHART.top - CHART.bottom);
const path = (points: { year: number; people: number }[]) => points.map((p, i) => `${i ? 'L' : 'M'} ${Math.round(x(p.year))} ${Math.round(y(p.people))}`).join(' ');
const HISTORY = [{ year: 1800, people: 0.98 }, ...BILLIONS.map((year, i) => ({ year, people: i + 1 }))];
const DRAW = { from: 0.4, to: 3.4 };

/**
 * The population over time: drawn year by year to 2022 in the curve scene (`grow`), and in the last, the projection
 * after it (`next`, 0 to 1), dashed, to its peak.
 */
function Chart({ grow, next = 0 }: { grow: number; next?: number }) {
  const year = 1800 + 222 * grow;
  const shown = HISTORY.filter((p) => p.year <= year);
  const last = shown.at(-1)!;
  const nextPoint = HISTORY.find((p) => p.year > year);
  const tip = nextPoint ? { year, people: last.people + ((nextPoint.people - last.people) * (year - last.year)) / (nextPoint.year - last.year) } : last;
  const projected = 2022 + 78 * next;
  const ahead = PROJECTION.filter((p) => p.year <= projected);
  const following = PROJECTION.find((p) => p.year > projected);
  const end = following && ahead.length ? { year: projected, people: ahead.at(-1)!.people + ((following.people - ahead.at(-1)!.people) * (projected - ahead.at(-1)!.year)) / (following.year - ahead.at(-1)!.year) } : ahead.at(-1);
  return (
    <svg width={CHART.w} height={CHART.h} style={{ overflow: 'visible' }}>
      {[0, 2, 4, 6, 8, 10].map((n) => (
        <g key={n}>
          <line x1={CHART.left} x2={CHART.w - CHART.right} y1={y(n)} y2={y(n)} stroke={C.rail} strokeWidth={2} />
          <text x={CHART.left - 20} y={y(n) + 12} textAnchor="end" fill={C.dim} style={{ ...type, fontSize: 32 }}>{n}</text>
        </g>
      ))}
      <text x={CHART.left - 20} y={y(11) + 12} textAnchor="end" fill={C.dim} style={{ ...type, fontSize: 28 }}>bn</text>
      {[1800, 1850, 1900, 1950, 2000, 2050, 2100].map((yr) => (
        <text key={yr} x={x(yr)} y={CHART.h - 20} textAnchor="middle" fill={C.dim} style={{ ...type, fontSize: 32 }}>{yr}</text>
      ))}
      <path d={path([...shown, tip])} fill="none" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
      {shown.slice(1).map((p) => (
        <g key={p.year}>
          <circle cx={x(p.year)} cy={y(p.people)} r={10} fill={p.people === 8 ? C.accent : C.ink} />
          {(p.people === 1 || p.people === 8) && next === 0 && (
            <text x={x(p.year) + (p.people === 1 ? 24 : -24)} y={y(p.people) - 26} textAnchor={p.people === 1 ? 'start' : 'end'} fill={p.people === 8 ? C.accent : C.ink} style={{ ...type, fontSize: 40, fontWeight: 700 }}>
              {p.people} bn · {p.year}
            </text>
          )}
        </g>
      ))}
      {next > 0 && end && (
        <>
          <path d={path([...ahead, end])} fill="none" stroke={C.accent} strokeWidth={8} strokeDasharray="4 18" strokeLinecap="round" />
          <circle cx={x(end.year)} cy={y(end.people)} r={10} fill={C.accent} />
        </>
      )}
    </svg>
  );
}

/** The curve scene: the line drawn from 1800, the year it has reached counting with it. */
function Curve() {
  const t = useTime();
  const grow = ease(t, DRAW.from, DRAW.to, 0, 1, Easing.inOutSine);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: C.ink, opacity: ease(t, 0, 0.4) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ ...type, fontSize: 56, fontWeight: 700 }}>World population, in billions</p>
        <p style={{ ...type, fontSize: 72, fontWeight: 800, color: C.accent }}>{Math.round(1800 + 222 * grow)}</p>
      </div>
      <Chart grow={grow} />
    </div>
  );
}

/** Each gap as a bar, grown and counted to its real number of years, one after another. */
function Gaps() {
  const t = useTime();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: C.ink, opacity: ease(t, 0, 0.4) }}>
      <p style={{ ...type, fontSize: 56, fontWeight: 700, marginBottom: 12 }}>Years to add each billion</p>
      {GAPS.map((gap, i) => {
        const grow = ease(t, 0.3 + i * 0.25, 1.1 + i * 0.25, 0, 1, Easing.outQuart);
        const latest = i === GAPS.length - 1;
        return (
          <div key={gap.to} style={{ display: 'flex', alignItems: 'center', height: 70 }}>
            <span style={{ ...type, fontSize: 40, width: 230, color: C.dim }}>
              {gap.from} → {gap.to} bn
            </span>
            <div style={{ height: 50, width: Math.max(4, Math.round((gap.years / LONGEST) * 1160 * grow)), borderRadius: 6, background: latest ? C.accent : C.ink, opacity: latest ? 1 : 0.85 }} />
            <span style={{ ...type, fontSize: 44, fontWeight: 700, marginLeft: 24, color: latest ? C.accent : C.ink }}>{Math.round(gap.years * grow)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The latest billion, as the figure to keep. */
function Latest() {
  const t = useTime();
  const count = Math.round(ease(t, 0.2, 1.0, 0, GAPS.at(-1)!.years, Easing.outQuart));
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 80, color: C.ink, opacity: ease(t, 0, 0.4) }}>
      <div style={{ ...type, fontSize: 480, fontWeight: 800, letterSpacing: -20, color: C.accent, width: 600, textAlign: 'right' }}>{count}</div>
      <div>
        <p style={{ ...type, fontSize: 120, fontWeight: 700 }}>years</p>
        <p style={{ ...type, fontSize: 48, color: C.dim, marginTop: 32, maxWidth: 820, lineHeight: 1.3 }}>from 7 to 8 billion people, 2011 to 2022. Going from 1 to 2 billion took 123.</p>
      </div>
    </div>
  );
}

/** What the UN expects next: the curve again, carried on dashed to its peak. */
function Next() {
  const t = useTime();
  const next = ease(t, 0.4, 2.4, 0, 1, Easing.inOutSine);
  const peak = ease(t, 2.3, 2.8);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: C.ink, opacity: ease(t, 0, 0.4) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <p style={{ ...type, fontSize: 56, fontWeight: 700 }}>And next: growth slows</p>
        <p style={{ ...type, fontSize: 48, fontWeight: 700, color: C.accent, opacity: peak }}>Peak ≈ 10.4 bn, 2080s</p>
      </div>
      <Chart grow={1} next={next} />
    </div>
  );
}

const STAGE = { x: 160, y: 110, w: 1600, h: 800 };

export default function Main() {
  return (
    <Film>
      <Sound src="media/bed.mp3" volume={-4} fadeOut={1.5} />
      <Sound src="media/effects.mp3" volume={-3} />
      <Layer id="ground">
        <Ground />
      </Layer>
      <Layer id="source" x={160} y={980} w={1600} h={50}>
        <Source />
      </Layer>
      <Scene id="question" duration={AT.curve - AT.question}>
        <Line id="question-line">How long does it take to add a billion people?</Line>
        <Layer id="question-title" x={160} y={160} w={1600} h={760}>
          <Question />
        </Layer>
      </Scene>
      <Scene id="curve" duration={AT.gaps - AT.curve}>
        <Line id="curve-line">One billion in 1804. Eight billion in 2022.</Line>
        <Layer id="population-curve" {...STAGE}>
          <Curve />
        </Layer>
      </Scene>
      <Scene id="gaps" duration={AT.latest - AT.gaps}>
        <Line id="gaps-line">From one billion to two took 123 years. Each billion since has come faster.</Line>
        <Layer id="gap-chart" {...STAGE}>
          <Gaps />
        </Layer>
      </Scene>
      <Scene id="latest" duration={AT.next - AT.latest}>
        <Line id="latest-line">The eighth billion took eleven years.</Line>
        <Layer id="latest-figure" {...STAGE}>
          <Latest />
        </Layer>
      </Scene>
      <Scene id="next" duration={AT.end - AT.next}>
        <Line id="next-line">The UN expects growth to slow, to a peak of about 10.4 billion in the 2080s.</Line>
        <Layer id="projection" {...STAGE}>
          <Next />
        </Layer>
      </Scene>
    </Film>
  );
}
