// The title cards: on paper, the chapter's number and a headline that moves, with one live picture of its own, then a
// shape that gives way to the Studio beneath.
import type {ReactNode} from 'react';
import {Easing, seededRandom} from '@motionhub/runtime';
import {AIS, CHAPTERS, INTRO, MOTIONS} from './words';
import claudeIcon from '../media/claude-code.png';
import codexIcon from '../media/codex.png';
import geminiIcon from '../media/gemini.svg';
import deepseekIcon from '../media/deepseek.svg';
import {ChapterNumber, COBALT, Headline, INK, LANG, MONO, MUTED, PAPER, PINK, SANS, VERMILION, clamp01, ease, pieces, spring} from './kit';

export type Exit = 'box' | 'blinds' | 'iris' | 'wipe' | 'flash';

/** The card for chapter `n` (0 the intro) at `t` seconds into its scene; it is gone by `card`. */
export function Card({n, t, card, exitLen, exit}: {n: number; t: number; card: number; exitLen: number; exit: Exit}) {
  if (t >= card) return null;
  const p = ease(t, card - exitLen, card, 0, 1, Easing.inOutCubic);
  const face = <Face n={n} t={t} />;
  const sheet = (clip?: string, shift = '') => (
    <div style={{position: 'absolute', inset: 0, background: PAPER, clipPath: clip, transform: shift}}>{face}</div>
  );
  if (exit === 'box') {
    const i = p * 50;
    return sheet(`inset(${i}% ${i}% ${i}% ${i}% round ${40 + p * 60}px)`, `scale(${1 - p * 0.08})`);
  }
  if (exit === 'iris') {
    const r = (1 - p) * 1150;
    return (
      <>
        {sheet(`circle(${r}px at 50% 50%)`)}
        {p > 0 && (
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
            <circle cx={960} cy={540} r={r} fill="none" stroke={VERMILION} strokeWidth={22} />
          </svg>
        )}
      </>
    );
  }
  if (exit === 'wipe') {
    const d = -500 + p * 2900;
    return (
      <>
        <div style={{position: 'absolute', inset: 0, background: VERMILION, clipPath: `polygon(${d - 90}px 0, 2600px 0, 2600px 1080px, ${d - 490}px 1080px)`}} />
        {sheet(`polygon(${d}px 0, 2600px 0, 2600px 1080px, ${d - 400}px 1080px)`)}
      </>
    );
  }
  if (exit === 'blinds') {
    const strips = 6;
    return (
      <>
        {Array.from({length: strips}, (_, i) => {
          const q = ease(t, card - exitLen + i * 0.035, card - 0.04 * (strips - 1 - i) * 0.3, 0, 1, Easing.inOutCubic);
          // Each strip overlaps the next by 2 px, so no seam shows the picture beneath while they wait to go (the film is
          // often seen scaled down, where an edge falls between pixels).
          const top = Math.max(0, (i * 1080) / strips - 2), bottom = Math.max(0, 1080 - ((i + 1) * 1080) / strips - 2);
          return <div key={i}>{sheet(`inset(${top}px 0 ${bottom}px 0)`, `translateX(${(i % 2 ? 1 : -1) * q * 2000}px)`)}</div>;
        })}
      </>
    );
  }
  // flash: the card punches forward and a white flash hands over to the Studio.
  const white = p < 0.5 ? p * 2 : (1 - p) * 2;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, opacity: 1 - clamp01(p * 2 - 0.6)}}>{sheet(undefined, `scale(${1 + p * 0.3})`)}</div>
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: white * 0.9}} />
    </>
  );
}

function Column({children}: {children: ReactNode}) {
  return <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 140px'}}>{children}</div>;
}

function Face({n, t}: {n: number; t: number}) {
  const head = (n === 0 ? INTRO : CHAPTERS[n - 1]!).head[LANG];
  if (n === 0)
    return (
      <Column>
        <div style={{font: `500 34px ${MONO}`, letterSpacing: '0.12em', color: MUTED, marginBottom: 36, opacity: clamp01(t / 0.2)}}>OpenMotionStudio</div>
        <Headline text={head} t={t} at={0.05} />
      </Column>
    );
  const number = <ChapterNumber n={n} t={t} />;
  switch (n) {
    case 1:
      return <Column>{number}<Typed text={head} t={t} /></Column>;
    case 2:
      return (
        <Column>
          {number}
          <Headline text={head} t={t} at={0.08} size={LANG === 'zh' ? 120 : 112} keyStyle={(pr) => {
            const o = 4 + 16 * (1 - pr);
            return {color: COBALT, textShadow: `${o}px ${o * 0.5}px 0 ${PINK}`};
          }} />
          <Mosaic t={t} />
        </Column>
      );
    case 3:
      return <Column>{number}<Headline text={head} t={t} at={0.06} render={(s, key) => (key ? <Circled s={s} t={t} /> : s)} /></Column>;
    case 4:
      return <Column>{number}<Headline text={head} t={t} at={0.06} /><Logos t={t} /></Column>;
    case 5:
      return <Column>{number}<Headline text={head} t={t} at={0.06} /><Wave t={t} /></Column>;
    default:
      return <Column>{number}<Headline text={head} t={t} at={0.06} /><Progress t={t} /></Column>;
  }
}

/** Chapter 1: the headline typed, a caret at its end. */
function Typed({text, t}: {text: string; t: number}) {
  const parts = pieces(text);
  const chars = parts.reduce((k, p) => k + [...p.s].length, 0);
  const rate = 0.7 / chars;
  let shown = Math.max(0, Math.floor((t - 0.12) / rate));
  const caretOn = t < 0.12 + chars * rate || Math.floor(t * 3.2) % 2 === 0;
  return (
    <div style={{font: `${LANG === 'zh' ? 900 : 800} ${LANG === 'zh' ? 136 : 124}px/1.12 ${SANS}`, letterSpacing: LANG === 'zh' ? '0.02em' : '-0.035em', color: INK, textAlign: 'center'}}>
      {parts.map((p, k) => {
        if (p.br) return <br key={k} />;
        const s = [...p.s].slice(0, Math.max(0, shown)).join('');
        shown -= [...p.s].length;
        return <span key={k} style={{color: p.key ? VERMILION : INK, whiteSpace: 'pre'}}>{s}</span>;
      })}
      <span style={{display: 'inline-block', width: 10, height: '0.9em', marginLeft: 8, verticalAlign: '-0.08em', background: VERMILION, opacity: caretOn ? 1 : 0}} />
    </div>
  );
}

/** Chapter 2: some of motionhub's motions, as tiles in their own colours, flipping in one after another. */
function Mosaic({t}: {t: number}) {
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 300px)', gap: 18, marginTop: 56}}>
      {MOTIONS.map(([name, ground, ink], i) => {
        const p = spring(t, 0.3 + i * 0.05, 0.5, 0.45);
        return (
          <div key={name} style={{height: 92, borderRadius: 14, background: ground, color: ink, display: 'flex', alignItems: 'center', justifyContent: 'center',
            font: `700 34px ${SANS}`, letterSpacing: '-0.01em', boxShadow: '0 10px 30px rgba(42,38,34,0.12)',
            transform: `perspective(600px) rotateX(${(1 - p) * 90}deg)`, opacity: clamp01((t - 0.3 - i * 0.05) / 0.08)}}>{name}</div>
        );
      })}
    </div>
  );
}

/** Chapter 4: the AIs it works with, their own marks beside their names, and any model by its API key. */
function Logos({t}: {t: number}) {
  // Each mark on its tile: the agents' own art on ink, the services' icons, inverted to white, on their brand colours.
  const marks: [string, string, boolean][] = [[codexIcon, INK, false], [claudeIcon, INK, false], [geminiIcon, '#8E75B2', true], [deepseekIcon, '#5786FE', true]];
  return (
    <div style={{display: 'flex', gap: 26, marginTop: 70}}>
      {AIS.map((name, i) => {
        const p = spring(t, 0.45 + i * 0.14, 0.55, 0.45);
        const [icon, tile, invert] = marks[i]!;
        return (
          <div key={name} style={{display: 'flex', alignItems: 'center', gap: 18, font: `700 42px ${SANS}`, color: INK, background: '#fff',
            borderRadius: 999, padding: '16px 36px 16px 18px', boxShadow: '0 16px 40px rgba(42,38,34,0.14)',
            transform: `translateY(${(1 - p) * 60}px) scale(${0.6 + 0.4 * p})`, opacity: clamp01((t - 0.45 - i * 0.14) / 0.1)}}>
            <span style={{width: 66, height: 66, borderRadius: 16, background: tile, display: 'grid', placeItems: 'center'}}>
              <img src={icon} style={{width: invert ? 38 : 46, height: invert ? 38 : 46, filter: invert ? 'invert(1)' : undefined}} />
            </span>
            {name}
          </div>
        );
      })}
    </div>
  );
}

/** Chapter 3: a ring drawn round the key words, by hand. It is drawn in the words' own pixels (their width estimated
 * from the face's size), so the stroke keeps its weight and its drawing runs the whole way round. */
function Circled({s, t}: {s: string; t: number}) {
  const d = ease(t, 0.42, 0.95, 0, 1, Easing.inOutCubic);
  const size = LANG === 'zh' ? 136 : 124;
  const w = [...s].reduce((sum, c) => sum + (/[　-鿿]/.test(c) ? 1.02 : 0.47), 0) * size * 1.18;
  const h = size * 1.12 * 1.52;
  const path = [[54, 4], [92, 4], [100, 36], [98, 54], [96, 84], [62, 98], [40, 96], [12, 94], [0, 72], [2, 48], [4, 20], [30, 6], [60, 8]]
    .map(([x, y]) => `${((x! / 100) * w).toFixed(1)} ${((y! / 100) * h).toFixed(1)}`);
  const d0 = `M ${path[0]} C ${path[1]} ${path[2]} ${path[3]} C ${path[4]} ${path[5]} ${path[6]} C ${path[7]} ${path[8]} ${path[9]} C ${path[10]} ${path[11]} ${path[12]}`;
  return (
    <>
      {s}
      <svg width={w} height={h} style={{position: 'absolute', left: '50%', top: '50%', marginLeft: -w / 2, marginTop: -h / 2, overflow: 'visible'}}>
        <path d={d0} pathLength={1} fill="none" stroke={VERMILION} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={1} strokeDashoffset={1 - d} />
      </svg>
    </>
  );
}

/** Chapter 5: a voice, as bars that move. */
function Wave({t}: {t: number}) {
  const random = seededRandom(3);
  const bars = Array.from({length: 36}, (_, i) => ({i, a: 0.4 + random() * 0.6, f: 6 + random() * 7}));
  const on = ease(t, 0.3, 0.6);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, height: 170, marginTop: 50}}>
      {bars.map((b) => {
        const v = Math.abs(Math.sin(b.i * 0.55 + t * b.f) * Math.sin(b.i * 0.23 + t * 4.1));
        return <div key={b.i} style={{width: 14, height: 14 + 150 * b.a * v * on, borderRadius: 7, background: b.i % 9 === 4 ? VERMILION : INK}} />;
      })}
    </div>
  );
}

/** Chapter 6: an export that fills to the end, then the file. */
function Progress({t}: {t: number}) {
  const p = ease(t, 0.3, 1.0, 0, 1, Easing.inOutCubic);
  const done = spring(t, 1.0, 0.4, 0.6);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 36, marginTop: 64}}>
      <div style={{width: 820, height: 22, borderRadius: 11, background: 'rgba(42,38,34,0.12)', overflow: 'hidden'}}>
        <div style={{width: `${p * 100}%`, height: '100%', background: p >= 1 ? VERMILION : INK, borderRadius: 11}} />
      </div>
      <div style={{font: `500 46px ${MONO}`, color: INK, width: 170, textAlign: 'right'}}>{Math.round(p * 100)}%</div>
      <div style={{font: `500 40px ${MONO}`, color: PAPER, background: VERMILION, borderRadius: 14, padding: '12px 24px', transform: `scale(${done})`}}>.mp4</div>
    </div>
  );
}
