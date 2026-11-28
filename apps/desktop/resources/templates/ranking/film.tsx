import { Film, Scene, Layer, Line, Sound, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

/**
 * The ranking: its title, what the number is, where it comes from, and its items, any number of them, in any order.
 * The film sorts them, gives each place below the first a scene of its own, last place first, draws every item as a
 * disc to scale, then the first place, then the whole board. `note` is a line said about an item; `color`, its disc's.
 * Change it, and run `oms sound` again for the effects, which are timed to five items.
 */
const RANKING = {
  title: 'The largest planets',
  measure: 'Diameter at the equator',
  unit: 'km',
  source: 'Source: NASA Planetary Fact Sheet',
  items: [
    { name: 'Jupiter', value: 142984, color: '#D9A066', note: 'Eleven Earths would fit across it.' },
    { name: 'Saturn', value: 120536, color: '#E3C98A', note: 'Nine and a half Earths across, not counting its rings.', ring: true },
    { name: 'Uranus', value: 51118, color: '#9FD8E0', note: 'Four Earths across, and tipped on its side.' },
    { name: 'Neptune', value: 49528, color: '#4C6FE0', note: 'Almost four Earths across.' },
    { name: 'Earth', value: 12756, color: '#3D8BD9', note: 'The yardstick for the rest.' },
  ] as { name: string; value: number; color?: string; note?: string; ring?: boolean }[],
};

// The look: a planetarium's wall chart. Ground #0B0D14, ink #EEF0F5, the place being told in #FFB547, the rest #6E7588;
// Inter with tabular figures.
const C = { ground: '#0B0D14', ink: '#EEF0F5', accent: '#FFB547', dim: '#6E7588', bar: '#2A2F3E', disc: '#8A90A3' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } as const;

const ITEMS = [...RANKING.items].sort((a, b) => b.value - a.value);
const LARGEST = ITEMS[0]!.value;
/** How long the title, each place, the first place and the board are on screen. */
const TIME = { title: 2.6, place: 2.6, first: 3.4, board: 3.6 };
const format = (value: number) => value.toLocaleString('en-US');
const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

/** The discs' row: smallest on the left, each to scale, standing on one line across the bottom of the frame. */
const ROW = { w: 1600, h: 520, gap: 40 };
/** How far a ring reaches past its disc, on each side, as a share of the disc. */
const RING = 0.25;
const SCALE = (ROW.w - ROW.gap * (ITEMS.length - 1)) / ITEMS.reduce((sum, item) => sum + item.value * (item.ring ? 1 + 2 * RING : 1), 0);
const SIZE = Math.min(ROW.h - 40, Math.round(LARGEST * SCALE));
const diameter = (value: number) => Math.max(8, Math.round((value / LARGEST) * SIZE));

/**
 * Every item as a disc to scale. `shown` is how many places have come in so far, counting from the last; the one
 * coming in now (`arrive`, 0 to 1) is lit, the others wait dimmed.
 */
function Discs({ shown, arrive = 1, lit }: { shown: number; arrive?: number; lit?: number }) {
  const order = [...ITEMS].reverse();
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
      {order.map((item, i) => {
        const place = ITEMS.length - i;
        const d = diameter(item.value);
        const here = i < shown;
        const k = i === shown - 1 ? arrive : here ? 1 : 0;
        const focus = lit === place;
        return (
          <div key={item.name} style={{ width: item.ring ? Math.round(d * (1 + 2 * RING)) : d, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: here ? 1 : 0.12 }}>
            <div style={{ position: 'relative', width: d, height: d, transform: `scale(${here ? 0.6 + 0.4 * k : 1})`, transformOrigin: '50% 100%' }}>
              {item.ring && <div style={{ position: 'absolute', left: -d * RING, right: -d * RING, top: '42%', height: '16%', borderRadius: '50%', border: `${Math.max(3, Math.round(d / 40))}px solid ${item.color ?? C.disc}`, opacity: 0.7, transform: 'rotate(-12deg)' }} />}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: item.color ?? C.disc, opacity: focus || lit === undefined ? 1 : 0.55, boxShadow: focus ? `0 0 0 6px ${C.ground}, 0 0 0 12px ${C.accent}` : 'none' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The cover: the title, and the whole row already standing. */
function Title() {
  return (
    <div style={{ color: C.ink }}>
      <p style={{ ...type, fontSize: 44, fontWeight: 700, color: C.accent, marginBottom: 24 }}>Top {ITEMS.length} · {RANKING.measure.toLowerCase()}</p>
      <h1 style={{ ...type, fontSize: 140, fontWeight: 800, letterSpacing: -5 }}>{RANKING.title}</h1>
    </div>
  );
}

/** A place: its number, its name, its value counted up, and what is said about it. */
function Place({ place }: { place: number }) {
  const t = useTime();
  const item = ITEMS[place - 1]!;
  const count = ease(t, 0.3, 1.3, 0, 1, Easing.outQuart);
  return (
    <div style={{ color: C.ink, opacity: ease(t, 0, 0.35), transform: `translateY(${Math.round((1 - ease(t, 0, 0.35)) * 24)}px)` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 36 }}>
        <span style={{ ...type, fontSize: 180, fontWeight: 800, color: C.accent, letterSpacing: -6 }}>{place}</span>
        <span style={{ ...type, fontSize: 120, fontWeight: 700, letterSpacing: -3 }}>{item.name}</span>
      </div>
      <p style={{ ...type, fontSize: 64, fontWeight: 600, marginTop: 20 }}>
        {format(Math.round(item.value * count))} <span style={{ color: C.dim }}>{RANKING.unit}</span>
      </p>
      {item.note && <p style={{ ...type, fontSize: 44, color: C.dim, marginTop: 24, opacity: ease(t, 1.0, 1.5) }}>{item.note}</p>}
    </div>
  );
}

/** A scene's row of discs, the place being told coming in. */
function Row({ place }: { place: number }) {
  const t = useTime();
  const arrive = ease(t, 0.15, 0.65, 0, 1, Easing.outBack);
  return <Discs shown={ITEMS.length - place + 1} arrive={arrive} lit={place} />;
}

/** The whole board, first place lit, the bars to scale. */
function Board() {
  const t = useTime();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: C.ink }}>
      <p style={{ ...type, fontSize: 52, fontWeight: 700, opacity: ease(t, 0, 0.4) }}>
        {RANKING.title} <span style={{ fontWeight: 400, color: C.dim }}>· {RANKING.measure.toLowerCase()}</span>
      </p>
      {ITEMS.map((item, i) => {
        const grow = ease(t, 0.2 + i * 0.12, 0.9 + i * 0.12, 0, 1, Easing.outQuart);
        const first = i === 0;
        return (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 28, height: 96 }}>
            <span style={{ ...type, fontSize: 64, fontWeight: 800, width: 80, color: first ? C.accent : C.dim }}>{i + 1}</span>
            <span style={{ ...type, fontSize: 48, fontWeight: 600, width: 280, color: first ? C.accent : C.ink }}>{item.name}</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ height: 56, borderRadius: 8, width: `${Math.max(0.5, (item.value / LARGEST) * 76 * grow)}%`, background: first ? C.accent : (item.color ?? C.bar) }} />
              <span style={{ ...type, fontSize: 44, fontWeight: 600, color: first ? C.accent : C.ink, whiteSpace: 'nowrap', opacity: grow }}>
                {format(item.value)} {RANKING.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Source() {
  return <p style={{ ...type, fontSize: 32, color: C.dim }}>{RANKING.source}</p>;
}

const TEXT = { x: 160, y: 100, w: 1600, h: 420 };
const DISCS = { x: 160, y: 400, w: ROW.w, h: ROW.h };
const PLACES = ITEMS.map((_, i) => ITEMS.length - i).filter((place) => place > 1);

export default function Main() {
  const first = ITEMS[0]!;
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
      <Scene id="title" duration={TIME.title}>
        <Line id="title-line">{`${RANKING.title}, by ${RANKING.measure.toLowerCase()}.`}</Line>
        <Layer id="title-text" {...TEXT}>
          <Title />
        </Layer>
        <Layer id="title-discs" {...DISCS}>
          <Discs shown={ITEMS.length} />
        </Layer>
      </Scene>
      {PLACES.map((place) => (
        <Scene key={place} id={`place-${place}`} duration={TIME.place}>
          <Line id={`place-${place}-line`}>{`Number ${place}: ${ITEMS[place - 1]!.name}, ${format(ITEMS[place - 1]!.value)} ${RANKING.unit}. ${ITEMS[place - 1]!.note ?? ''}`.trim()}</Line>
          <Layer id={`place-${place}-text`} {...TEXT}>
            <Place place={place} />
          </Layer>
          <Layer id={`place-${place}-discs`} {...DISCS}>
            <Row place={place} />
          </Layer>
        </Scene>
      ))}
      <Scene id="first-place" duration={TIME.first}>
        <Line id="first-place-line">{`And number 1: ${first.name}, ${format(first.value)} ${RANKING.unit}. ${first.note ?? ''}`.trim()}</Line>
        <Layer id="first-place-text" {...TEXT}>
          <Place place={1} />
        </Layer>
        <Layer id="first-place-discs" {...DISCS}>
          <Row place={1} />
        </Layer>
      </Scene>
      <Scene id="board" duration={TIME.board}>
        <Line id="board-line">{`The top ${ITEMS.length}, side by side.`}</Line>
        <Layer id="board-bars" x={160} y={110} w={1600} h={800}>
          <Board />
        </Layer>
      </Scene>
    </Film>
  );
}
