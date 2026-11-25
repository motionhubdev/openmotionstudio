// The title cards: on paper, the chapter's number and a headline that moves, with one live picture of its own, then a
// shape that gives way to the Studio beneath.
import type {ReactNode} from 'react';
import {Easing, seededRandom} from '@motionhub/runtime';
import {AIS, CHAPTERS, INTRO} from './words';
import {ChapterNumber, COBALT, Headline, INK, LANG, MONO, MUTED, PAPER, PINK, SANS, VERMILION, clamp01, ease, pieces, spring} from './kit';

export type Exit = 'box' | 'blinds' | 'iris' | 'wipe' | 'flash';

/** The card for chapter `n` (0 the intro) at `t` seconds into its scene; it is gone by `card`. */
export function Card({n, t, card, exitLen, exit, drop}: {n: number; t: number; card: number; exitLen: number; exit: Exit; drop: number}) {
  if (t >= card) return null;
  const p = ease(t, card - exitLen, card, 0, 1, Easing.inOutCubic);
  const face = <Face n={n} t={t} drop={drop} />;
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
          const top = (i * 100) / strips, bottom = 100 - ((i + 1) * 100) / strips;
          return <div key={i}>{sheet(`inset(${top}% 0 ${bottom}% 0)`, `translateX(${(i % 2 ? 1 : -1) * q * 2000}px)`)}</div>;
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

function Face({n, t, drop}: {n: number; t: number; drop: number}) {
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
          <Headline text={head} t={t} at={0.08} keyStyle={(pr) => {
            const o = 4 + 16 * (1 - pr);
            return {color: COBALT, textShadow: `${o}px ${o * 0.5}px 0 ${PINK}`};
          }} />
          <Swatches t={t} />
        </Column>
      );
    case 3:
      return <Column>{number}<Headline text={head} t={t} at={0.06} render={(s, key) => (key ? <Circled s={s} t={t} /> : s)} /></Column>;
    case 4:
      return <Column>{number}<Bubble t={t}><Headline text={head} t={t} at={0.16} size={LANG === 'zh' ? 120 : 108} /></Bubble></Column>;
    case 5:
      return <Column>{number}<Headline text={head} t={t} at={0.06} /><Chips t={t} /></Column>;
    case 6:
      return <Column><Bars t={t} drop={drop} /><Slam text={head} t={t} drop={drop} /></Column>;
    case 7:
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

/** Chapter 2: a look's colours, dropped in under the headline. */
function Swatches({t}: {t: number}) {
  const colours = [COBALT, PINK, VERMILION, INK, '#f2c14e'];
  return (
    <div style={{display: 'flex', gap: 28, marginTop: 56}}>
      {colours.map((c, i) => {
        const p = spring(t, 0.35 + i * 0.06, 0.5);
        return <div key={c} style={{width: 74, height: 74, borderRadius: 37, background: c, transform: `translateY(${(1 - p) * -60}px) scale(${p})`}} />;
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

/** Chapter 4: a speech bubble that pops open round the headline. */
function Bubble({t, children}: {t: number; children: ReactNode}) {
  const p = spring(t, 0.02, 0.55, 0.5);
  return (
    <div style={{position: 'relative', padding: '56px 84px', borderRadius: 64, background: '#fff', boxShadow: '0 30px 80px rgba(42,38,34,0.14)',
      transform: `scale(${0.3 + 0.7 * p})`, opacity: clamp01(t / 0.12)}}>
      {children}
      <div style={{position: 'absolute', left: 120, bottom: -34, width: 70, height: 70, background: '#fff', transform: 'rotate(45deg) skew(12deg, 12deg)', borderRadius: 8}} />
    </div>
  );
}

/** Chapter 5: the AIs it works with, as chips. */
function Chips({t}: {t: number}) {
  return (
    <div style={{display: 'flex', gap: 26, marginTop: 64}}>
      {AIS[LANG].map((name, i) => {
        const p = spring(t, 0.4 + i * 0.09, 0.5);
        return (
          <div key={name} style={{font: `500 44px ${MONO}`, color: PAPER, background: INK, borderRadius: 999, padding: '18px 38px',
            transform: `translateY(${(1 - p) * 50}px) scale(${0.6 + 0.4 * p})`, opacity: clamp01((t - 0.4 - i * 0.09) / 0.1)}}>{name}</div>
        );
      })}
    </div>
  );
}

/** Chapter 6: four bars rise; on the drop the tallest turns vermilion. */
function Bars({t, drop}: {t: number; drop: number}) {
  const heights = [0.38, 0.58, 0.78, 1];
  const hit = spring(t, drop, 0.45, 0.6);
  return (
    <div style={{display: 'flex', alignItems: 'flex-end', gap: 26, height: 260, marginBottom: 60}}>
      {heights.map((h, i) => {
        const p = spring(t, 0.02 + i * 0.07, 0.5);
        const last = i === heights.length - 1;
        const on = last && t >= drop;
        return <div key={i} style={{width: 86, height: 260 * h * p * (on ? 1 + 0.12 * (1 - hit) : 1), background: on ? VERMILION : COBALT, borderRadius: 6}} />;
      })}
    </div>
  );
}

/** Chapter 6's headline: it slams down on the drop and shakes the frame. */
function Slam({text, t, drop}: {text: string; t: number; drop: number}) {
  const p = spring(t, drop - 0.1, 0.4, 0.2);
  const shake = t > drop ? Math.sin((t - drop) * 70) * 14 * Math.exp(-(t - drop) * 9) : 0;
  return (
    <div style={{opacity: clamp01((t - drop + 0.12) / 0.08), transform: `translateX(${shake}px) scale(${1 + 1.4 * (1 - p)})`}}>
      <Headline text={text} t={t} at={drop - 0.12} stagger={0} size={LANG === 'zh' ? 150 : 136} />
    </div>
  );
}

/** Chapter 7: a voice, as bars that move. */
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

/** Chapter 8: an export that fills to the end, then the file. */
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
