import { Film, Scene, Layer, Line, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';
import studio from './media/studio.jpg';
import exporting from './media/export.jpg';

export const film = { width: 1080, height: 1920, fps: 30 };

// The look: the product is the picture. A pale studio wall #F4F1EC, ink #1A1816, the Studio's own export red #E5483A as
// the one accent; Inter. Portrait: the headline in the top band, the product's screen large below it, the foot empty.
const C = { wall: '#F4F1EC', ink: '#1A1816', accent: '#E5483A', dim: '#7D766C' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.05 } as const;

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.inOutCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

/** The screenshot's size, and the parts of it each scene looks at, in its own pixels. */
const SHOT = { w: 2400, h: 1440 };
type Rect = { x: number; y: number; w: number; h: number };
const VIEWS: Record<string, Rect> = {
  whole: { x: 0, y: 0, w: 2400, h: 1440 },
  stage: { x: 588, y: 90, w: 1284, h: 1000 },
  timeline: { x: 556, y: 900, w: 840, h: 540 },
  /** The timeline's Lines row: what the film says, each line a block to point at. */
  lines: { x: 690, y: 1132, w: 700, h: 56 },
};
const WIDTH = 960;

/**
 * The Studio's own window, framed on `to`, moving there from `from` as the scene opens; `mark`, a part of it outlined in
 * the accent once the move has settled.
 */
function Screen({ from, to, mark }: { from: Rect; to: Rect; mark?: Rect }) {
  const t = useTime();
  const k = ease(t, 0.1, 1.2);
  const view = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, w: from.w + (to.w - from.w) * k, h: from.h + (to.h - from.h) * k };
  const scale = WIDTH / view.w;
  const marked = ease(t, 1.2, 1.6);
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'flex-start' }}>
      <div style={{ width: WIDTH, height: Math.round(view.h * scale), position: 'relative', overflow: 'hidden', borderRadius: 28, background: '#141210', boxShadow: '0 40px 80px rgba(26, 24, 22, 0.25)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: SHOT.w, height: SHOT.h, transformOrigin: '0 0', transform: `scale(${scale}) translate(${-view.x}px, ${-view.y}px)` }}>
          <img src={studio} style={{ width: SHOT.w, height: SHOT.h, display: 'block' }} />
          {mark && (
            <div style={{ position: 'absolute', left: mark.x, top: mark.y, width: mark.w, height: mark.h, border: `6px solid ${C.accent}`, borderRadius: 12, opacity: marked, transform: `scale(${1.08 - 0.08 * marked})` }} />
          )}
        </div>
      </div>
    </div>
  );
}

/** A scene's headline in the top band, rising in as the scene opens (already in place on the cover). */
function Headline({ kicker, title, still = false }: { kicker: string; title: string; still?: boolean }) {
  const t = useTime();
  const rise = still ? 1 : ease(t, 0, 0.5);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: C.ink, opacity: rise, transform: `translateY(${Math.round((1 - rise) * 30)}px)` }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 600, letterSpacing: 5, color: C.accent, marginBottom: 24 }}>{kicker}</p>
      <h1 style={{ ...type, fontSize: 104, fontWeight: 800, letterSpacing: -4 }}>{title}</h1>
    </div>
  );
}

/** The export dialog, set down on the wall. */
function Export() {
  const t = useTime();
  const land = ease(t, 0.1, 0.7, 0, 1, Easing.outBack);
  const note = ease(t, 0.8, 1.2);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64 }}>
      <img src={exporting} style={{ width: 920, borderRadius: 28, boxShadow: '0 40px 80px rgba(26, 24, 22, 0.25)', transform: `scale(${0.85 + 0.15 * land})`, opacity: Math.min(1, land * 1.5) }} />
      <p style={{ ...type, fontSize: 48, fontWeight: 500, color: C.dim, opacity: note }}>Free and open source · Apache-2.0</p>
    </div>
  );
}

function Wall() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.wall }}>
      <style>{face}</style>
    </div>
  );
}

const TOP = { x: 60, y: 150, w: 960, h: 260 };
const PICTURE = { x: 60, y: 470, w: 960, h: 1030 };

export default function Main() {
  return (
    <Film>
      <Layer id="wall">
        <Wall />
      </Layer>
      <Scene id="cover" duration={2.2}>
        <Line id="cover-line">OpenMotionStudio: motion video, made with an agent.</Line>
        <Layer id="cover-title" {...TOP}>
          <Headline kicker="OPENMOTIONSTUDIO" title="Make motion with an agent." still />
        </Layer>
        <Layer id="cover-window" {...PICTURE}>
          <Screen from={VIEWS.whole!} to={VIEWS.whole!} />
        </Layer>
      </Scene>
      <Scene id="watch" duration={2.4}>
        <Line id="watch-line">Watch your film play as it is made.</Line>
        <Layer id="watch-title" {...TOP}>
          <Headline kicker="01 · WATCH" title="See it play." />
        </Layer>
        <Layer id="watch-window" {...PICTURE}>
          <Screen from={VIEWS.whole!} to={VIEWS.stage!} />
        </Layer>
      </Scene>
      <Scene id="point" duration={2.2}>
        <Line id="point-line">Point at a scene, a layer or a line to change it.</Line>
        <Layer id="point-title" {...TOP}>
          <Headline kicker="02 · POINT" title="Point at a change." />
        </Layer>
        <Layer id="point-window" {...PICTURE}>
          <Screen from={VIEWS.stage!} to={VIEWS.timeline!} mark={VIEWS.lines!} />
        </Layer>
      </Scene>
      <Scene id="export" duration={2.2}>
        <Line id="export-line">Export an MP4, on your own computer.</Line>
        <Layer id="export-title" {...TOP}>
          <Headline kicker="03 · EXPORT" title="Leave with an MP4." />
        </Layer>
        <Layer id="export-dialog" {...PICTURE}>
          <Export />
        </Layer>
      </Scene>
    </Film>
  );
}
