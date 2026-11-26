// Chapter 1's first seconds, drawn rather than recorded, in the cards' own grammar: one thing at a time, large, on
// paper, on the beat. The sentence is typed into a box and sent; the agent makes the film's three scenes; then the film
// itself (the recorded part) cuts in on the beat. `u` is seconds from the start of this part, which falls on a beat.
import {Easing} from '@motionhub/runtime';
import {CHECKED, MAKING, PROMPT, SCRIPT, STEPS} from './words';
import {INK, LANG, MUTED, PAPER, SANS, VERMILION, clamp01, ease, spring} from './kit';
import claude from '../media/claude-code.png';
import scene1 from '../media/scene-1.png';
import scene2 from '../media/scene-2.png';
import scene3 from '../media/scene-3.png';

export const BEAT = 60 / 130;

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
          <div style={{position: 'relative', marginLeft: 'auto', width: 92, height: 92, borderRadius: '50%', background: VERMILION, display: 'flex',
            alignItems: 'center', justifyContent: 'center', transform: `scale(${pressed})`, boxShadow: '0 12px 30px rgba(196,56,31,0.35)'}}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {press >= 0 && <Ring d={press} />}
          </div>
        </div>
      </div>
      <Making u={u - b(6)} />
    </div>
  );
}

/** The press of the send button: a ring spreading from it, centred on it. */
function Ring({d}: {d: number}) {
  if (d > 0.7) return null;
  const r = 46 + 110 * ease(d, 0, 0.6);
  return <div style={{position: 'absolute', left: 46 - r, top: 46 - r, width: 2 * r, height: 2 * r, borderRadius: '50%',
    border: `6px solid ${VERMILION}`, opacity: 1 - d / 0.7}} />;
}

/** The agent at work, a step every two beats: each step's card, then what it made, then its tick. */
function Making({u}: {u: number}) {
  if (u < 0) return null;
  const p = spring(u, 0, 0.5, 0.3);
  const zh = LANG === 'zh';
  return (
    <div style={{position: 'absolute', inset: 0, opacity: clamp01(u / 0.2)}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24,
        transform: `translateY(${(1 - p) * 50}px)`}}>
        <img src={claude} style={{width: 72, height: 72, borderRadius: 18}} />
        <span style={{font: `${zh ? 900 : 800} 68px ${SANS}`, color: INK, letterSpacing: zh ? 0 : '-0.02em'}}>{MAKING[LANG]}</span>
      </div>
      {STEPS.map((step, k) => {
        const at = (1 + 2 * k) * BEAT;  // its card
        if (u < at) return null;
        const q = spring(u, at, 0.5, 0.35);
        const made = spring(u, at + 0.6 * BEAT, 0.5, 0.3);
        const tick = spring(u, at + 1.2 * BEAT, 0.4, 0.6);
        return (
          <div key={k} style={{position: 'absolute', left: 170 + k * 540, top: 370, width: 500, height: 470, boxSizing: 'border-box', padding: 30,
            background: '#fff', borderRadius: 32, boxShadow: '0 24px 60px rgba(42,38,34,0.13)', opacity: clamp01(q * 2),
            transform: `translateY(${(1 - q) * 70}px)`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
              <div style={{width: 54, height: 54, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center',
                background: tick > 0 ? VERMILION : 'rgba(42,38,34,0.08)', font: `800 28px ${SANS}`, color: INK}}>
                {tick > 0 ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                    style={{transform: `scale(${tick})`}}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                ) : k + 1}
              </div>
              <span style={{font: `${zh ? 900 : 800} 36px ${SANS}`, color: INK, letterSpacing: zh ? 0 : '-0.01em', whiteSpace: 'nowrap'}}>{step[LANG]}</span>
            </div>
            <div style={{marginTop: 28, height: 330, opacity: clamp01(made * 1.5), transform: `translateY(${(1 - made) * 30}px)`}}>
              {k === 0 && <Script />}
              {k === 1 && <Scenes made={made} />}
              {k === 2 && <Checked />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** What the first step made: the film's three lines. */
function Script() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
      {SCRIPT.map((line, i) => (
        <div key={i} style={{display: 'flex', gap: 14, font: `500 27px/1.35 ${SANS}`, color: INK}}>
          <span style={{font: `700 24px/1.5 ${SANS}`, color: VERMILION, flex: 'none'}}>0{i + 1}</span>{line}
        </div>
      ))}
    </div>
  );
}

/** What the second made: its three scenes, fanned out. */
function Scenes({made}: {made: number}) {
  return (
    <div style={{position: 'relative', height: 330}}>
      {[scene1, scene2, scene3].map((src, i) => (
        <img key={i} src={src} style={{position: 'absolute', left: 22 + i * 44 * made, top: 10 + i * 66 * made, width: 352, height: 198, borderRadius: 14,
          objectFit: 'cover', boxShadow: '0 10px 26px rgba(0,0,0,0.25)', transform: `rotate(${(i - 1) * 3 * made}deg)`}} />
      ))}
    </div>
  );
}

/** What the third made: every frame checked, clean. */
function Checked() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10}}>
        {[scene1, scene1, scene2, scene2, scene2, scene3, scene3, scene3].map((src, i) => (
          <img key={i} src={src} style={{width: '100%', height: 58, objectFit: 'cover', borderRadius: 8}} />
        ))}
      </div>
      <div style={{font: `800 34px ${SANS}`, color: INK, letterSpacing: '-0.01em', whiteSpace: 'nowrap'}}>{CHECKED[LANG][0]}</div>
      <div style={{font: `500 28px ${SANS}`, color: MUTED, marginTop: -12}}>{CHECKED[LANG][1]}</div>
    </div>
  );
}
