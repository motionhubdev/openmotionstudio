import { Film, Scene, Layer, Line, Sound, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

/**
 * The ranking: its title, what the number is, where it comes from, and its items, any number of them, in any order.
 * The film sorts them, counts down from the last to the first, and sizes every bar and the scenes from this table.
 * Change it, and run `oms sound` again for the effects, which are timed to five items.
 */
const RANKING = {
  title: 'The largest planets',
  measure: 'Diameter at the equator',
  unit: 'km',
  source: 'Source: NASA Planetary Fact Sheet',
  items: [
    { name: 'Jupiter', value: 142984 },
    { name: 'Saturn', value: 120536 },
    { name: 'Uranus', value: 51118 },
    { name: 'Neptune', value: 49528 },
    { name: 'Earth', value: 12756 },
  ],
};

// The look: a museum's wall chart. Ground #F4F2EC, ink #16181D, the first place in #E8573A, the rest #9AA0AA; Inter
// with tabular figures.
const C = { ground: '#F4F2EC', ink: '#16181D', accent: '#E8573A', bar: '#C9CCD2', dim: '#6D727C' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } as const;

const ITEMS = [...RANKING.items].sort((a, b) => b.value - a.value);
const LARGEST = ITEMS[0]!.value;
/** Each place is revealed in turn, the last first, this long apart. */
const STEP = 1.1;
const COUNTDOWN = ITEMS.length * STEP + 0.4;
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

/** The ranking's title, and what is measured: on screen from the first frame. */
function Title() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: C.ink }}>
      <p style={{ ...type, fontSize: 44, fontWeight: 600, color: C.accent, marginBottom: 28 }}>Top {ITEMS.length}</p>
      <h1 style={{ ...type, fontSize: 150, fontWeight: 800, letterSpacing: -5 }}>{RANKING.title}</h1>
      <p style={{ ...type, fontSize: 48, color: C.dim, marginTop: 36 }}>{RANKING.measure}</p>
    </div>
  );
}

/**
 * Every place as a row, first at the top. `from` is when, in the scene, the last place starts to come in; the others
 * follow a step apart. `lit` lights the first place in the accent.
 */
function Board({ from = Infinity, lit = false }: { from?: number; lit?: boolean }) {
  const t = useTime();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: C.ink }}>
      <p style={{ ...type, fontSize: 48, fontWeight: 700 }}>
        {RANKING.title} <span style={{ fontWeight: 400, color: C.dim }}>· {RANKING.measure.toLowerCase()}</span>
      </p>
      {ITEMS.map((item, i) => {
        const order = ITEMS.length - 1 - i;
        const shown = from === Infinity ? 1 : ease(t, from + order * STEP, from + order * STEP + 0.7, 0, 1, Easing.outQuart);
        const first = i === 0;
        const colour = first && lit ? C.accent : C.ink;
        return (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 28, height: 96, opacity: Math.min(1, shown * 2) }}>
            <span style={{ ...type, fontSize: 64, fontWeight: 800, width: 90, color: first && lit ? C.accent : C.dim }}>{i + 1}</span>
            <span style={{ ...type, fontSize: 48, fontWeight: 600, width: 300, color: colour }}>{item.name}</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ height: 56, borderRadius: 8, width: `${Math.max(0.5, (item.value / LARGEST) * 78 * shown)}%`, background: first && lit ? C.accent : C.bar }} />
              <span style={{ ...type, fontSize: 44, fontWeight: 600, color: colour, whiteSpace: 'nowrap' }}>
                {format(Math.round(item.value * shown))} {RANKING.unit}
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

const BOARD = { x: 160, y: 120, w: 1600, h: 760 };

export default function Main() {
  const [first] = ITEMS;
  return (
    <Film>
      <Sound src="media/effects.mp3" />
      <Layer id="ground">
        <Ground />
      </Layer>
      <Layer id="source" x={160} y={960} w={1600} h={50}>
        <Source />
      </Layer>
      <Scene id="title" duration={2}>
        <Line id="title-line">{`The ${RANKING.title.toLowerCase().replace(/^the /, '')}, by ${RANKING.measure.toLowerCase()}.`}</Line>
        <Layer id="title-card" x={160} y={160} w={1600} h={700}>
          <Title />
        </Layer>
      </Scene>
      <Scene id="countdown" duration={COUNTDOWN}>
        {[...ITEMS].reverse().map((item, i) => (
          <Line key={item.name} id={`place-${ITEMS.length - i}`} at={0.2 + i * STEP} dur={STEP}>
            {`Number ${ITEMS.length - i}: ${item.name}, ${format(item.value)} ${RANKING.unit}.`}
          </Line>
        ))}
        <Layer id="countdown-board" {...BOARD}>
          <Board from={0.2} />
        </Layer>
      </Scene>
      <Scene id="first-place" duration={2.1}>
        <Line id="first-place-line">{`${first!.name} is first.`}</Line>
        <Layer id="first-place-board" {...BOARD}>
          <Board lit />
        </Layer>
      </Scene>
    </Film>
  );
}
