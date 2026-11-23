// A 20-second portrait film drawn from code alone: no media, so it shows the syntax a film uses.
// Images, fonts and sounds would be imported from the project (`import url from './media/shot.png'`), and a
// sound named by its path: <Sound src="media/chime.wav" at={0.2} volume={-12} />.
import {Film, Scene, Layer, Line, Sequence, useTime, useVideoConfig, interpolate, Easing, seededRandom} from '@motionhub/runtime';

/** The film's size and rate; its scenes decide its length. */
export const film = {width: 540, height: 960, fps: 24};

const INK = '#fff8ef';
const ACCENT = '#ffc59d';
const FACE = 'system-ui, sans-serif';

/** A headline that rises into place over its first half second; the cover's is there from frame 0, the thumbnail. */
function Headline({text, cover = false}: {text: string; cover?: boolean}) {
  const now = useTime();
  const t = cover ? 1 : now;
  const y = interpolate(t, [0, 0.55], [24, 0], {easing: Easing.outCubic, clamp: true});
  const opacity = interpolate(t, [0, 0.4], [0, 1], {clamp: true});
  return <div style={{font: `700 62px/1.05 ${FACE}`, letterSpacing: '-0.04em', color: INK, opacity, transform: `translateY(${y}px)`}}>{text}</div>;
}

/** A card that slides in; inside a <Sequence>, its time starts at the sequence's `from`. */
function Card({label, tint}: {label: string; tint: string}) {
  const t = useTime();
  const x = interpolate(t, [0, 0.7], [-60, 0], {easing: Easing.outBack, clamp: true});
  const opacity = interpolate(t, [0, 0.3], [0, 1], {clamp: true});
  return (
    <div style={{height: 76, marginBottom: 18, borderRadius: 18, background: tint, opacity, transform: `translateX(${x}px)`,
      display: 'flex', alignItems: 'center', padding: '0 28px', font: `600 40px ${FACE}`, color: '#202320'}}>
      {label}
    </div>
  );
}

/** A field of dots placed by seededRandom, so every frame draws them in the same places, and one picked out. */
function Detail() {
  const t = useTime();
  const random = seededRandom(7);
  const dots = Array.from({length: 36}, (_, i) => ({i, x: 20 + random() * 452, y: 20 + random() * 252}));
  const picked = dots[11]!;
  const ring = interpolate(t, [1.5, 2.5], [0, 1], {easing: Easing.inOutCubic, clamp: true});
  const pulse = 1 + 0.08 * Math.sin(t * Math.PI * 2);
  return (
    <svg width="100%" height="100%" viewBox="0 0 492 292">
      {dots.map((dot) => (
        <circle key={dot.i} cx={dot.x} cy={dot.y} r={dot === picked ? 12 : 7} fill={dot === picked ? ACCENT : '#5b625b'} />
      ))}
      <circle cx={picked.x} cy={picked.y} r={34 * ring * pulse} fill="none" stroke={ACCENT} strokeWidth={4} opacity={ring} />
    </svg>
  );
}

/** A bar that fills across the frame's width, read from the film's own size. */
function Progress() {
  const t = useTime();
  const {width} = useVideoConfig();
  const fill = interpolate(t, [0.2, 1.6], [0, width - 68], {easing: Easing.inOutSine, clamp: true});
  return <div style={{height: 10, width: fill, borderRadius: 5, background: ACCENT}} />;
}

export default function Main() {
  return (
    <Film>
      {/* A layer directly in <Film> is drawn across every scene. */}
      <Layer id="background">
        <div style={{height: '100%', background: '#202320'}} />
      </Layer>

      <Scene id="compose" duration={9}>
        {/* Lines are what a scene says: the script and the subtitles. `at` and `dur` time one in the scene. */}
        <Line id="compose-line">Start with a scene.</Line>
        <Layer id="title" x={34} y={130} w={472} h={155}><Headline text="Start with a scene." cover /></Layer>
        <Layer id="cards" x={34} y={335} w={472} h={292}>
          <Sequence from={0.4} duration={8.6}><Card label="Intro" tint="#d9e6d3" /></Sequence>
          <Sequence from={0.8} duration={8.2}><Card label="Detail" tint="#f3dfc4" /></Sequence>
          <Sequence from={1.2} duration={7.8}><Card label="Ending" tint="#e8d3e6" /></Sequence>
        </Layer>
      </Scene>

      <Scene id="refine" duration={9}>
        <Line id="refine-line" dur={4}>Pick a detail.</Line>
        <Line id="refine-change" at={4.5}>Say what to change.</Line>
        <Layer id="title" x={34} y={130} w={472} h={155}><Headline text="Pick a detail." /></Layer>
        <Layer id="detail" x={24} y={335} w={492} h={292} z={1}><Detail /></Layer>
      </Scene>

      <Scene id="download" duration={2}>
        <Line id="download-line">Make your film.</Line>
        <Layer id="title" x={34} y={130} w={472} h={155}><Headline text="Make your film." /></Layer>
        <Layer id="progress" x={34} y={600} w={472} h={10}><Progress /></Layer>
        <Layer id="download-address" x={34} y={730} w={472} h={75}>
          <span style={{font: `500 38px ${FACE}`, color: ACCENT}}>openmotion.studio</span>
        </Layer>
      </Scene>
    </Film>
  );
}
