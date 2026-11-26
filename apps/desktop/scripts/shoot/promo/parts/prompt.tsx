// Chapter 1's first seconds, drawn rather than recorded, in the cards' own grammar: one thing at a time, large, on
// paper, on the beat. The sentence is typed into a box and sent; the agent makes the film's three scenes; then the film
// itself (the recorded part) cuts in on the beat. `u` is seconds from the start of this part, which falls on a beat.
import {Easing} from '@motionhub/runtime';
import {MAKING, PROMPT} from './words';
import {INK, LANG, MUTED, PAPER, SANS, VERMILION, clamp01, ease, spring} from './kit';
import claude from '../media/claude-code.png';

export const BEAT = 60 / 130;
/** Its length: the cut to the film falls on the tenth beat. */
export const PROMPT_LEN = 10 * BEAT;
/** When, in beats, the sentence is sent and each scene is made: for the effects. */
export const PROMPT_CUES: [number, string][] = [[5, 'land'], [7, 'count'], [8, 'count'], [9, 'count']];

export function Prompt({u}: {u: number}) {
  const b = (k: number) => k * BEAT;
  const text = PROMPT[LANG];
  // Typed from the first beat to the fourth, a piece at a time (a word, or a Chinese character).
  const parts = LANG === 'zh' ? [...text] : text.split(/(?<= )/);
  const shown = parts.slice(0, Math.round(parts.length * clamp01((u - b(1)) / (b(4) - b(1))))).join('');
  const press = u - b(5);
  const pressed = press >= 0 && press < 0.18 ? 0.9 : 1;
  // The box comes up as the card leaves, and goes up and out once it is sent.
  const inP = spring(u, 0, 0.6, 0.3);
  const out = ease(u, b(5) + 0.12, b(6), 0, 1, Easing.inCubic);
  const caret = u < b(5) && Math.floor(u / 0.4) % 2 === 0;
  const zh = LANG === 'zh';
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 310, top: 330, width: 1300, padding: '54px 64px 40px', boxSizing: 'border-box',
        background: '#fff', borderRadius: 36, boxShadow: '0 30px 80px rgba(42,38,34,0.14)',
        opacity: 1 - out, transform: `translateY(${(1 - inP) * 80 - out * 260}px) scale(${0.94 + 0.06 * inP - 0.08 * out})`}}>
        <div style={{font: `${zh ? 500 : 400} 64px/1.3 ${SANS}`, color: INK, minHeight: 166, letterSpacing: zh ? '0.02em' : '-0.01em'}}>
          {shown}
          <span style={{display: 'inline-block', width: 4, height: 66, marginLeft: 4, verticalAlign: -10, background: VERMILION, opacity: caret ? 1 : 0}} />
        </div>
        <div style={{display: 'flex', alignItems: 'center', marginTop: 26}}>
          <img src={claude} style={{width: 40, height: 40, borderRadius: 10}} />
          <span style={{font: `500 30px ${SANS}`, color: MUTED, marginLeft: 14}}>Claude Code</span>
          <div style={{marginLeft: 'auto', width: 92, height: 92, borderRadius: '50%', background: VERMILION, display: 'flex',
            alignItems: 'center', justifyContent: 'center', transform: `scale(${pressed})`, boxShadow: '0 12px 30px rgba(196,56,31,0.35)'}}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>
      {press >= 0 && <Ring d={press} />}
      <Making u={u - b(6)} />
    </div>
  );
}

/** The press of the send button: a ring spreading from it. */
function Ring({d}: {d: number}) {
  if (d > 0.7) return null;
  const r = 46 + 110 * ease(d, 0, 0.6);
  return <div style={{position: 'absolute', left: 1500 - r, top: 622 - r, width: 2 * r, height: 2 * r, borderRadius: '50%',
    border: `6px solid ${VERMILION}`, opacity: 1 - d / 0.7}} />;
}

/** The agent at work: its mark and a line, then the film's three scenes, made one a beat. */
function Making({u}: {u: number}) {
  if (u < 0) return null;
  const p = spring(u, 0, 0.5, 0.3);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 380, display: 'flex', flexDirection: 'column', alignItems: 'center',
      opacity: clamp01(u / 0.2), transform: `translateY(${(1 - p) * 60}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <img src={claude} style={{width: 76, height: 76, borderRadius: 18}} />
        <span style={{font: `${LANG === 'zh' ? 900 : 800} 72px ${SANS}`, color: INK, letterSpacing: LANG === 'zh' ? 0 : '-0.02em'}}>{MAKING[LANG]}</span>
      </div>
      <div style={{display: 'flex', gap: 28, marginTop: 70}}>
        {[0, 1, 2].map((i) => {
          const q = spring(u, (i + 1) * BEAT, 0.45, 0.5);
          return (
            <div key={i} style={{width: 220, height: 124, borderRadius: 24, background: q > 0 ? VERMILION : 'rgba(42,38,34,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.9 + 0.1 * q})`,
              boxShadow: q > 0 ? '0 14px 30px rgba(196,56,31,0.3)' : 'none'}}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                style={{opacity: q, transform: `scale(${q})`}}>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
