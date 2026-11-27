import { Film, Scene, Layer, Line, Sound, useCompositionTime, interpolate, Easing, seededRandom } from '@motionhub/runtime';
import maShanZheng from './media/fonts/ma-shan-zheng-400.ttf';
import notoSerif from './media/fonts/noto-serif-sc-400.ttf';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a hanging scroll. Rice paper #EFE8DA, ink #1E1C1A in washes of itself, a seal's red #B8322A, and only when
// the poem says so, evening light #E9B65E and moss #6E7F4A. The poem in a brush face (Ma Shan Zheng), set vertically and
// read right to left; the poet's name in a serif (Noto Serif SC). Wang Wei's 鹿柴 (8th century) is in the public domain.
const C = { paper: '#EFE8DA', ink: '#1E1C1A', seal: '#B8322A', light: '#E9B65E', moss: '#6E7F4A' };
const faces = `
  @font-face { font-family: 'Ma Shan Zheng'; font-weight: 400; src: url(${maShanZheng}); font-display: block; }
  @font-face { font-family: 'Noto Serif SC'; font-weight: 400; src: url(${notoSerif}); font-display: block; }`;

/** The poem's four lines, and when each starts to be brushed on, in seconds into the film. */
const VERSES = [
  { text: '空山不见人，', at: 2.5 },
  { text: '但闻人语响。', at: 4.3 },
  { text: '返景入深林，', at: 6.3 },
  { text: '复照青苔上。', at: 8.1 },
];
/** The evening light enters with the third line; the moss is lit with the fourth. */
const LIGHT = VERSES[2]!.at;
const MOSS = VERSES[3]!.at;

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.inOutSine) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

function Paper() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.paper }}>
      <style>{faces}</style>
    </div>
  );
}

/** A ridge of mountains: a wash across the box, its height wandering by a seeded walk. */
function ridge(seed: number, base: number, rise: number, width: number) {
  const random = seededRandom(seed);
  const points: string[] = [`0,${base + 40}`];
  let y = base;
  for (let x = 0; x <= width; x += 40) {
    y = Math.max(base - rise, Math.min(base, y + (random() - 0.5) * 70));
    points.push(`${x},${Math.round(y)}`);
  }
  points.push(`${width},620`, `0,620`);
  return points.join(' ');
}
const RIDGES = [
  { points: ridge(3, 300, 230, 960), opacity: 0.12 },
  { points: ridge(8, 390, 200, 960), opacity: 0.22 },
  { points: ridge(21, 470, 150, 960), opacity: 0.45 },
];
/** The forest floor where the light lands: patches of moss, lit green on the last line. */
const MOSS_PATCHES = Array.from({ length: 9 }, (_, i) => {
  const random = seededRandom(40 + i);
  return { x: 120 + i * 88 + Math.round(random() * 30), y: 560 + Math.round(random() * 30), r: 26 + Math.round(random() * 22) };
});

/** The empty mountain, in ink washes that fade into the paper at their edges; then the low sun's light comes in, and the moss shows its green. */
function Landscape() {
  const t = useCompositionTime();
  const light = ease(t, LIGHT, LIGHT + 1.6);
  const moss = ease(t, MOSS + 0.3, MOSS + 1.5);
  return (
    <svg width={960} height={640} viewBox="0 0 960 640">
      <defs>
        <radialGradient id="mist" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0.6" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="edge">
          <rect width={960} height={640} fill="url(#mist)" />
        </mask>
        <linearGradient id="ray" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.light} stopOpacity={0.7} />
          <stop offset="1" stopColor={C.light} stopOpacity={0} />
        </linearGradient>
      </defs>
      <g mask="url(#edge)">
      {RIDGES.map((r, i) => (
        <polygon key={i} points={r.points} fill={C.ink} opacity={r.opacity} />
      ))}
      <polygon points="960,40 960,180 240,640 60,640" fill="url(#ray)" opacity={0.85 * light} />
      {MOSS_PATCHES.map((p, i) => (
        <ellipse key={i} cx={p.x} cy={p.y} rx={p.r * 1.6} ry={p.r * 0.6} fill={moss > 0 ? C.moss : C.ink} opacity={0.35 + 0.5 * moss} />
      ))}
      </g>
    </svg>
  );
}

/** One column of brushed characters, each inked in after the one before. */
function Column({ text, at, size }: { text: string; at: number; size: number }) {
  const t = useCompositionTime();
  return (
    <div style={{ writingMode: 'vertical-rl', fontFamily: "'Ma Shan Zheng', serif", fontSize: size, lineHeight: 1, letterSpacing: '0.12em', color: C.ink }}>
      {[...text].map((char, i) => {
        const inked = ease(t, at + i * 0.16, at + i * 0.16 + 0.5);
        return (
          <span key={i} style={{ opacity: inked, filter: `blur(${Math.round((1 - inked) * 6)}px)` }}>
            {char}
          </span>
        );
      })}
    </div>
  );
}

/** The title, the poet and his seal on the right; the verses to their left, as a scroll is read. */
function Poem() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'flex-start', gap: 56 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
        <Column text="鹿柴" at={-1} size={132} />
        <div style={{ writingMode: 'vertical-rl', fontFamily: "'Noto Serif SC', serif", fontSize: 44, letterSpacing: '0.3em', color: C.ink, opacity: 0.7 }}>唐 · 王维</div>
        <div style={{ width: 76, height: 76, background: C.seal, color: C.paper, display: 'grid', placeItems: 'center', fontFamily: "'Ma Shan Zheng', serif", fontSize: 30, lineHeight: 1, borderRadius: 6, writingMode: 'vertical-rl' }}>
          王维
        </div>
      </div>
      {VERSES.map((verse) => (
        <Column key={verse.text} text={verse.text} at={verse.at} size={100} />
      ))}
    </div>
  );
}

export default function Main() {
  return (
    <Film>
      <Sound src="media/brush.mp3" />
      <Layer id="paper">
        <Paper />
      </Layer>
      <Layer id="landscape" x={80} y={250} w={960} h={640}>
        <Landscape />
      </Layer>
      <Layer id="poem" x={1080} y={140} w={760} h={820}>
        <Poem />
      </Layer>
      <Scene id="title" duration={2.3}>
        <Line id="title-line">鹿柴 · 王维</Line>
      </Scene>
      <Scene id="empty-mountain" duration={3.8}>
        <Line id="verse-1">空山不见人，</Line>
        <Line id="verse-2">但闻人语响。</Line>
      </Scene>
      <Scene id="evening-light" duration={3.9}>
        <Line id="verse-3">返景入深林，</Line>
        <Line id="verse-4">复照青苔上。</Line>
      </Scene>
    </Film>
  );
}
