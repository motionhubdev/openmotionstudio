import type { CSSProperties } from 'react';
import { Film, Scene, Layer, Line, Sound, useTime, useCompositionTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a type specimen sheet that will not sit still. Paper #F1ECE2, ink #1B1A17, one accent #FF4D2E; Inter alone,
// its weight axis (100 to 900) doing what a second face would. Cut to media/kinetic.mp3, 120 beats a minute: a beat
// every 0.5 s, a bar every 2 s, each scene a whole number of bars.
const C = { paper: '#F1ECE2', ink: '#1B1A17', accent: '#FF4D2E', dim: '#8C857A' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1 } as const;
const BEAT = 0.5;

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });
/** Loudest on a beat, gone before the next: a hit for the picture to move with. */
const pulse = (t: number, every = BEAT, decay = 7) => Math.exp(-((((t % every) + every) % every) / every) * decay);

/** The words of the fast part, one a beat, each set as it says. */
const WORDS: { word: string; style: CSSProperties; ground: 'paper' | 'ink' | 'accent' }[] = [
  { word: 'light', style: { fontWeight: 100, fontSize: 320 }, ground: 'paper' },
  { word: 'BOLD', style: { fontWeight: 900, fontSize: 340, letterSpacing: -14 }, ground: 'ink' },
  { word: 'w i d e', style: { fontWeight: 500, fontSize: 220, letterSpacing: 40 }, ground: 'paper' },
  { word: 'tight', style: { fontWeight: 800, fontSize: 340, letterSpacing: -30 }, ground: 'accent' },
  { word: 'LOUD', style: { fontWeight: 900, fontSize: 460, letterSpacing: -18 }, ground: 'ink' },
  { word: 'quiet', style: { fontWeight: 200, fontSize: 140, letterSpacing: 6 }, ground: 'paper' },
  { word: 'fast', style: { fontWeight: 800, fontSize: 340, fontStyle: 'oblique 12deg', letterSpacing: -10 }, ground: 'accent' },
  { word: 'slow…', style: { fontWeight: 300, fontSize: 300, letterSpacing: 4 }, ground: 'paper' },
];

/** Where each scene starts, in seconds: the ground follows the scene, and the fast part's words. */
const AT = { whisper: 0, shout: 4, between: 6, fast: 10, breathe: 14, close: 16 };
const GROUNDS = { paper: C.paper, ink: C.ink, accent: C.accent };

function Ground() {
  const t = useCompositionTime();
  let ground = C.paper;
  if (t >= AT.shout && t < AT.between) ground = C.ink;
  if (t >= AT.fast && t < AT.breathe) ground = GROUNDS[WORDS[Math.min(7, Math.floor((t - AT.fast) / BEAT))]!.ground];
  return (
    <div style={{ width: '100%', height: '100%', background: ground }}>
      <style>{face}</style>
    </div>
  );
}

/** "whisper", at the face's lightest, breathing with the pad: on screen from the first frame. */
function Whisper() {
  const t = useTime();
  const spread = 0.04 + 0.06 * (0.5 - 0.5 * Math.cos((t / 4) * Math.PI * 2));
  const then = ease(t, 2.5, 3.0);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 160px', color: C.ink }}>
      <p style={{ ...type, fontSize: 40, fontWeight: 500, letterSpacing: 6, color: C.dim, marginBottom: 56 }}>ONE FACE · WEIGHT 100</p>
      <h1 style={{ ...type, fontSize: 380, fontWeight: 100, letterSpacing: `${spread}em`, transformOrigin: 'left center', transform: `scale(${1 + 0.05 * ease(t, 0, 4, 0, 1, Easing.inOutSine)})` }}>whisper</h1>
      <p style={{ ...type, fontSize: 96, fontWeight: 300, marginTop: 64, opacity: then, transform: `translateX(${Math.round((1 - then) * 48)}px)` }}>then…</p>
    </div>
  );
}

/** "SHOUT" at 900: a letter lands on each half beat, and the word shakes on the kicks after. */
function Shout() {
  const t = useTime();
  const shake = t > 1.25 ? pulse(t) * 10 : 0;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', transform: `translate(${Math.round(shake * (Math.floor(t / BEAT) % 2 ? 1 : -1))}px, 0)` }}>
        {'SHOUT'.split('').map((letter, i) => {
          const land = ease(t, i * 0.25 - 0.12, i * 0.25 + 0.08, 0, 1, Easing.outBack);
          return (
            <span key={i} style={{ ...type, fontSize: 440, fontWeight: 900, letterSpacing: -14, color: C.accent, display: 'inline-block', opacity: land > 0 ? 1 : 0, transform: `translateY(${Math.round((1 - land) * -320)}px) scale(${0.5 + 0.5 * land})` }}>
              {letter}
            </span>
          );
        })}
      </div>
      <p style={{ ...type, fontSize: 40, fontWeight: 500, letterSpacing: 6, color: C.dim, marginTop: 48, opacity: ease(t, 1.3, 1.6) }}>SAME FACE · WEIGHT 900</p>
    </div>
  );
}

/** "every weight between": a wave runs through the weight axis, its crest on each beat. */
function Wave() {
  const t = useTime();
  const enter = ease(t, 0, 0.3);
  const leave = ease(t, 3.6, 4, 1, 0);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: C.ink, opacity: enter * leave }}>
      <p style={{ ...type, fontSize: 84, fontWeight: 400, marginBottom: 48 }}>and every weight</p>
      <div style={{ display: 'flex' }}>
        {'BETWEEN'.split('').map((letter, i) => {
          const weight = Math.round(500 + 400 * Math.sin((t / BEAT) * Math.PI - i * 0.7));
          return (
            <span key={i} style={{ ...type, fontSize: 270, fontWeight: weight, width: 245, textAlign: 'center', color: weight > 820 ? C.accent : C.ink }}>
              {letter}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** One word a beat, each set as it says, punched in on its beat. */
function Fast() {
  const t = useTime();
  const i = Math.min(WORDS.length - 1, Math.floor(t / BEAT));
  const { word, style, ground } = WORDS[i]!;
  const k = pulse(t, BEAT, 9);
  const colour = ground === 'paper' ? C.ink : C.paper;
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <span style={{ ...type, ...style, color: colour, whiteSpace: 'pre', transform: `scale(${1 + 0.06 * k})` }}>{word}</span>
    </div>
  );
}

/** "let it breathe": the letters drift apart over the bar, on the pad alone. */
function Breathe() {
  const t = useTime();
  const spread = ease(t, 0, 2, 0, 0.28, Easing.inOutSine);
  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: C.ink }}>
      <h1 style={{ ...type, fontSize: 180, fontWeight: 200, letterSpacing: `${spread}em`, whiteSpace: 'nowrap', opacity: ease(t, 0, 0.4) }}>let it breathe</h1>
    </div>
  );
}

/** The close, landing with the drop: the line at a steady 700, underlined, then held. */
function Close() {
  const t = useTime();
  const land = ease(t, 0, 0.25, 0, 1, Easing.outBack);
  const draw = ease(t, 0.5, 1.2, 0, 1, Easing.inOutCubic);
  const note = ease(t, 1.6, 2.1);
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', padding: '0 160px', color: C.ink }}>
      <div>
        <h1 style={{ ...type, fontSize: 240, fontWeight: 800, letterSpacing: -9, transform: `scale(${0.85 + 0.15 * land})`, transformOrigin: 'left center', opacity: land > 0 ? 1 : 0 }}>Make it move.</h1>
        <div style={{ height: 18, marginTop: 44, background: C.accent, transformOrigin: 'left', transform: `scaleX(${draw})` }} />
        <p style={{ ...type, fontSize: 48, fontWeight: 400, color: C.dim, marginTop: 44, opacity: note }}>One face. Every weight. On the beat.</p>
      </div>
    </div>
  );
}

export default function Main() {
  return (
    <Film>
      <Sound src="media/kinetic.mp3" />
      <Layer id="ground">
        <Ground />
      </Layer>
      <Scene id="whisper" duration={AT.shout - AT.whisper}>
        <Line id="whisper-line">Start with a whisper.</Line>
        <Layer id="whisper-word">
          <Whisper />
        </Layer>
      </Scene>
      <Scene id="shout" duration={AT.between - AT.shout}>
        <Line id="shout-line">Then shout.</Line>
        <Layer id="shout-word">
          <Shout />
        </Layer>
      </Scene>
      <Scene id="between" duration={AT.fast - AT.between}>
        <Line id="between-line">And every weight between.</Line>
        <Layer id="weight-wave">
          <Wave />
        </Layer>
      </Scene>
      <Scene id="fast" duration={AT.breathe - AT.fast}>
        <Line id="fast-line">Light, bold, wide, tight, loud, quiet, fast, slow.</Line>
        <Layer id="beat-words">
          <Fast />
        </Layer>
      </Scene>
      <Scene id="breathe" duration={AT.close - AT.breathe}>
        <Line id="breathe-line">Let it breathe.</Line>
        <Layer id="breathe-word">
          <Breathe />
        </Layer>
      </Scene>
      <Scene id="close" duration={4}>
        <Line id="close-line">Make it move.</Line>
        <Layer id="close-title">
          <Close />
        </Layer>
      </Scene>
    </Film>
  );
}
