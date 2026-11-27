import { Film, Scene, Layer, Line, useTime, useCompositionTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a type specimen sheet that will not sit still. Paper #F1ECE2, ink #1B1A17, one accent #FF4D2E for the loud
// word; Inter alone, its weight axis (100 to 900) doing what a second face would.
const C = { paper: '#F1ECE2', ink: '#1B1A17', accent: '#FF4D2E', dim: '#8C857A' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1 } as const;

/** Where each scene starts, in seconds: the ground turns to ink while the film shouts. */
const SHOUT = [2.2, 4.2];

function Ground() {
  const t = useCompositionTime();
  const dark = t >= SHOUT[0] && t < SHOUT[1];
  return (
    <div style={{ width: '100%', height: '100%', background: dark ? C.ink : C.paper }}>
      <style>{face}</style>
    </div>
  );
}

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });

/** "whisper", at the face's lightest, already on screen at the first frame: the cover. */
function Whisper() {
  const t = useTime();
  const spread = ease(t, 0, 1.6, 0.02, 0.12, Easing.inOutSine);
  const then = ease(t, 1.0, 1.4);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 160px', color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 500, letterSpacing: 6, color: C.dim, marginBottom: 48 }}>ONE FACE · WEIGHT 100</p>
      <h1 style={{ ...type, fontSize: 360, fontWeight: 100, letterSpacing: `${spread}em` }}>whisper</h1>
      <p style={{ ...type, fontSize: 84, fontWeight: 300, marginTop: 56, opacity: then, transform: `translateX(${Math.round((1 - then) * 40)}px)` }}>
        then…
      </p>
    </div>
  );
}

/** "SHOUT", at the face's heaviest: each letter lands on its own beat. */
function Shout() {
  const t = useTime();
  const letters = 'SHOUT'.split('');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: C.paper }}>
      <div style={{ display: 'flex' }}>
        {letters.map((letter, i) => {
          const land = ease(t, 0.1 + i * 0.12, 0.45 + i * 0.12, 0, 1, Easing.outBack);
          return (
            <span
              key={i}
              style={{
                ...type,
                fontSize: 420,
                fontWeight: 900,
                letterSpacing: -12,
                color: C.accent,
                display: 'inline-block',
                opacity: Math.min(1, land * 2),
                transform: `translateY(${Math.round((1 - land) * -260)}px) scale(${0.6 + 0.4 * land})`,
              }}
            >
              {letter}
            </span>
          );
        })}
      </div>
      <p style={{ ...type, fontSize: 40, fontWeight: 500, letterSpacing: 6, color: C.dim, marginTop: 40, opacity: ease(t, 0.9, 1.3) }}>
        SAME FACE · WEIGHT 900
      </p>
    </div>
  );
}

/** "every weight between": a wave runs through the weight axis, letter by letter. */
function Wave() {
  const t = useTime();
  const word = 'BETWEEN'.split('');
  const enter = ease(t, 0, 0.4);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: C.ink, opacity: enter }}>
      <p style={{ ...type, fontSize: 84, fontWeight: 400, marginBottom: 40 }}>and every weight</p>
      <div style={{ display: 'flex' }}>
        {word.map((letter, i) => {
          const phase = Math.sin(t * 5 - i * 0.7);
          const weight = Math.round(500 + 400 * phase);
          return (
            <span key={i} style={{ ...type, fontSize: 260, fontWeight: weight, width: 245, textAlign: 'center', color: weight > 800 ? C.accent : C.ink }}>
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The close: the line set at a steady 700, underlined as it settles. */
function Close() {
  const t = useTime();
  const rise = ease(t, 0, 0.5);
  const draw = ease(t, 0.4, 0.9, 0, 1, Easing.inOutCubic);
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 160px', color: C.ink }}>
      <div>
        <h1 style={{ ...type, fontSize: 220, fontWeight: 700, letterSpacing: -8, opacity: rise, transform: `translateY(${Math.round((1 - rise) * 50)}px)` }}>
          Make it move.
        </h1>
        <div style={{ height: 16, marginTop: 40, background: C.accent, transformOrigin: 'left', transform: `scaleX(${draw})` }} />
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
      <Scene id="whisper" duration={2.2}>
        <Line id="whisper-line">Start with a whisper.</Line>
        <Layer id="whisper-word">
          <Whisper />
        </Layer>
      </Scene>
      <Scene id="shout" duration={2}>
        <Line id="shout-line">Then shout.</Line>
        <Layer id="shout-word">
          <Shout />
        </Layer>
      </Scene>
      <Scene id="between" duration={2}>
        <Line id="between-line">And every weight between.</Line>
        <Layer id="weight-wave">
          <Wave />
        </Layer>
      </Scene>
      <Scene id="close" duration={1.8}>
        <Line id="close-line">Make it move.</Line>
        <Layer id="close-title">
          <Close />
        </Layer>
      </Scene>
    </Film>
  );
}
