import { Film, Scene, Layer, Line, Video, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';
import recording from './media/studio-recording.mp4';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: an editor's monitor in a dark room. Ground #111113, ink #F2F0EB, one amber accent #F5B942 for the cut's
// numbers; Inter with tabular figures. The clip is a screen recording of the Studio playing a film, 1280 × 768.
const C = { ground: '#111113', ink: '#F2F0EB', accent: '#F5B942', dim: '#77757A' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' } as const;

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.inOutCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

/** The monitor's box, the clip's own shape (1280 × 768) at 1440 wide, and the Studio's stage inside it. */
const MONITOR = { x: 240, y: 150, w: 1440, h: 864 };
const STAGE = { x: 353, y: 61, w: 770, h: 432 };

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

/** What this cut takes from the clip, said as the film's code says it. */
function Slate({ name, cut, still = false }: { name: string; cut: string; still?: boolean }) {
  const t = useTime();
  const enter = still ? 1 : ease(t, 0, 0.4);
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: enter }}>
      <p style={{ ...type, fontSize: 48, fontWeight: 700, color: C.ink }}>{name}</p>
      <p style={{ ...type, fontSize: 40, fontWeight: 500, color: C.accent }}>{cut}</p>
    </div>
  );
}

/**
 * The recording in its monitor, from `trimBefore` seconds into it, shown `startAt` seconds into the scene; `zoom` runs
 * from the whole window (0) to the Studio's stage filling the monitor (1); `still`, on screen from the first frame.
 */
function Monitor({ trimBefore, startAt = 0, zoom = 0, still = false }: { trimBefore: number; startAt?: number; zoom?: number; still?: boolean }) {
  const t = useTime();
  const enter = still ? 1 : ease(t, 0, 0.4);
  const scale = 1 + (MONITOR.w / STAGE.w - 1) * zoom;
  const x = -STAGE.x * zoom;
  const y = -STAGE.y * zoom + ((MONITOR.h - STAGE.h * (MONITOR.w / STAGE.w)) / 2 / scale) * zoom;
  return (
    <div style={{ width: MONITOR.w, height: MONITOR.h, overflow: 'hidden', borderRadius: 18, background: '#000', boxShadow: '0 0 0 2px #2A292E', opacity: enter }}>
      <div style={{ width: MONITOR.w, height: MONITOR.h, transformOrigin: '0 0', transform: `scale(${scale}) translate(${x}px, ${y}px)` }}>
        <Video src={recording} trimBefore={trimBefore} startAt={startAt} />
      </div>
    </div>
  );
}

function Closer() {
  const t = useTime();
  return <Monitor trimBefore={2.6} zoom={ease(t, 0.3, 1.4)} still />;
}

export default function Main() {
  return (
    <Film>
      <Layer id="ground">
        <Ground />
      </Layer>
      <Scene id="window" duration={2.6}>
        <Line id="window-line">A screen recording of the Studio, as it was taken.</Line>
        <Layer id="window-slate" x={240} y={50} w={1440} h={80}>
          <Slate name="The whole take" cut="trimBefore 0.6 s" still />
        </Layer>
        <Layer id="window-clip" {...MONITOR}>
          <Monitor trimBefore={0.6} still />
        </Layer>
      </Scene>
      <Scene id="closer" duration={3}>
        <Line id="closer-line">Trimmed to the moment the bars grow, and framed on the film.</Line>
        <Layer id="closer-slate" x={240} y={50} w={1440} h={80}>
          <Slate name="In on the film" cut="trimBefore 2.6 s · scaled 1.87×" />
        </Layer>
        <Layer id="closer-clip" {...MONITOR}>
          <Closer />
        </Layer>
      </Scene>
      <Scene id="landing" duration={2.4}>
        <Line id="landing-line">Then straight to the figure it lands on.</Line>
        <Layer id="landing-slate" x={240} y={50} w={1440} h={80}>
          <Slate name="To the figure" cut="trimBefore 7.4 s · startAt 0.3 s" />
        </Layer>
        <Layer id="landing-clip" {...MONITOR}>
          <Monitor trimBefore={7.4} startAt={0.3} zoom={1} />
        </Layer>
      </Scene>
    </Film>
  );
}
