// The film's look: the website's paper, ink and vermilion, its faces, and the moves every card shares.
import type {CSSProperties, ReactNode} from 'react';
import {interpolate, Easing} from '@motionhub/runtime';
import inter_400 from '../media/fonts/inter-400.ttf';
import inter_700 from '../media/fonts/inter-700.ttf';
import inter_800 from '../media/fonts/inter-800.ttf';
import mono_500 from '../media/fonts/jetbrains-mono-500.ttf';
import sc_500 from '../media/fonts/noto-sans-sc-500.ttf';
import sc_900 from '../media/fonts/noto-sans-sc-900.ttf';
import language from './lang.json';
import type {Lang} from './words';

export const LANG = (language as {lang: Lang}).lang;

export const PAPER = '#f3f1ec';
export const INK = '#2a2622';
export const MUTED = '#69635a';
export const VERMILION = '#c4381f';
export const COBALT = '#2b59c3';
export const PINK = '#e8488a';
export const NIGHT = '#0f0d0b';

export const SANS = "'Inter', 'Noto Sans SC', sans-serif";
export const MONO = "'JetBrains Mono', 'Noto Sans SC', monospace";

export function Faces() {
  return (
    <style>{`
      @font-face { font-family: 'Inter'; font-weight: 400; src: url(${inter_400}); }
      @font-face { font-family: 'Inter'; font-weight: 700; src: url(${inter_700}); }
      @font-face { font-family: 'Inter'; font-weight: 800; src: url(${inter_800}); }
      @font-face { font-family: 'JetBrains Mono'; font-weight: 500; src: url(${mono_500}); }
      @font-face { font-family: 'Noto Sans SC'; font-weight: 500; src: url(${sc_500}); }
      @font-face { font-family: 'Noto Sans SC'; font-weight: 900; src: url(${sc_900}); }
    `}</style>
  );
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** A spring from 0 to 1 over about `dur` seconds from `at`: it overshoots a little and settles. */
export function spring(t: number, at: number, dur = 0.6, bounce = 0.35): number {
  const x = (t - at) / dur;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - Math.exp(-6 * x) * Math.cos((1 + bounce * 9) * x * Math.PI * 0.9) * (1 - x * 0.15);
}

export const ease = (t: number, a: number, b: number, from = 0, to = 1, easing = Easing.outCubic) =>
  interpolate(t, [a, b], [from, to], {easing, clamp: true});

/** A headline's pieces: words in English, characters in Chinese (a run of Latin letters stays one piece), `|` a break.
 * The key words (between *stars*) are one piece together, so they land, and can be dressed, as one. */
export function pieces(text: string): {s: string; key: boolean; br?: boolean}[] {
  const out: {s: string; key: boolean; br?: boolean}[] = [];
  let key = false;
  const tokens = LANG === 'zh' ? text.match(/\*|\||[A-Za-z0-9]+|\s+|./gu) ?? [] : text.match(/\*|\||[^\s*|]+|\s+/g) ?? [];
  for (const tok of tokens) {
    if (tok === '*') {
      key = !key;
      if (key) out.push({s: '', key: true});
    } else if (tok === '|') out.push({s: '', key: false, br: true});
    else if (key) out[out.length - 1]!.s += tok;
    else out.push({s: tok, key});
  }
  return out;
}

/** The headline, each piece springing up into place in turn from `at`. `keyStyle` dresses the key pieces; `render`
 * may replace how a piece is drawn (given its own progress). */
export function Headline({text, t, at = 0, size, stagger, keyStyle, render, style}: {
  text: string; t: number; at?: number; size?: number; stagger?: number; keyStyle?: (p: number) => CSSProperties;
  render?: (s: string, key: boolean, p: number) => ReactNode; style?: CSSProperties;
}) {
  const parts = pieces(text);
  const fontSize = size ?? (LANG === 'zh' ? 136 : 124);
  const step = stagger ?? (LANG === 'zh' ? 0.035 : 0.06);
  let i = 0;
  return (
    <div style={{font: `${LANG === 'zh' ? 900 : 800} ${fontSize}px/1.12 ${SANS}`, letterSpacing: LANG === 'zh' ? '0.02em' : '-0.035em',
      color: INK, textAlign: 'center', ...style}}>
      {parts.map((p, k) => {
        if (p.br) return <br key={k} />;
        if (/^\s+$/.test(p.s)) return <span key={k}>{p.s}</span>;
        const pr = spring(t, at + i++ * step, 0.55);
        const lin = clamp01((t - at - (i - 1) * step) / 0.18);
        return (
          <span key={k} style={{display: 'inline-block', opacity: lin, transform: `translateY(${(1 - pr) * 70}px) rotate(${(1 - pr) * 6}deg)`,
            transformOrigin: '0 100%', whiteSpace: 'nowrap', color: p.key ? VERMILION : INK, position: 'relative', ...(p.key && keyStyle ? keyStyle(pr) : {})}}>
            {render ? render(p.s, p.key, pr) : p.s}
          </span>
        );
      })}
    </div>
  );
}

/** The chapter's number, small, above the headline. */
export function ChapterNumber({n, t}: {n: number; t: number}) {
  const p = spring(t, 0.02, 0.5);
  return (
    <div style={{font: `500 34px ${MONO}`, letterSpacing: '0.12em', color: MUTED, opacity: clamp01(t / 0.15),
      transform: `translateY(${(1 - p) * 24}px)`, marginBottom: 36, textAlign: 'center'}}>
      <span style={{color: VERMILION}}>{String(n).padStart(2, '0')}</span> / 08
    </div>
  );
}
