// Chapters 3 to 6, drawn rather than recorded, in the cards' grammar (as parts/prompt.tsx does chapter 1): one thing at
// a time, large, on the beat. `u` is seconds from the first beat of the drawn part; each part's length in beats, and
// the beats its effects fall on, are in make.mjs's chapters.
import {Easing} from '@motionhub/runtime';
import {AGENT_ROWS, EXPORT_FILE, MODELS, NOTE, VOICES} from './words';
import {INK, LANG, MUTED, PAPER, SANS, VERMILION, clamp01, ease, spring} from './kit';
import {BEAT} from './prompt';
import claude from '../media/claude-code.png';
import codex from '../media/codex.png';
import gemini from '../media/gemini.svg';
import deepseek from '../media/deepseek.svg';
import before from '../media/moon-before.png';
import after from '../media/moon-after.png';
import final from '../media/moon-final.png';

const b = (k: number) => k * BEAT;
const zh = LANG === 'zh';
const PANEL = {background: '#fff', borderRadius: 36, boxShadow: '0 30px 80px rgba(42,38,34,0.14)'} as const;

function Send({press, size = 84}: {press: number; size?: number}) {
  const ring = press >= 0 && press < 0.7 ? press : null;
  const r = size / 2 + 110 * ease(press, 0, 0.6);
  return (
    <div style={{position: 'relative', width: size, height: size, borderRadius: '50%', background: VERMILION, display: 'flex',
      alignItems: 'center', justifyContent: 'center', transform: `scale(${press >= 0 && press < 0.18 ? 0.9 : 1})`,
      boxShadow: '0 12px 30px rgba(196,56,31,0.35)', flex: 'none'}}>
      <svg width={size * 0.48} height={size * 0.48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      {ring !== null && <div style={{position: 'absolute', left: size / 2 - r, top: size / 2 - r, width: 2 * r, height: 2 * r,
        borderRadius: '50%', border: `6px solid ${VERMILION}`, opacity: 1 - ring / 0.7}} />}
    </div>
  );
}

function Pill({text, show}: {text: string; show: number}) {
  return (
    <div style={{position: 'absolute', left: 64, bottom: 64, font: `800 44px ${SANS}`, color: '#fff', background: VERMILION,
      borderRadius: 999, padding: '14px 34px', boxShadow: '0 14px 34px rgba(0,0,0,0.35)', opacity: clamp01(show),
      transform: `translateX(${(1 - clamp01(show)) * -60}px)`}}>{text}</div>
  );
}

function typed(text: string, p: number) {
  const parts = zh ? [...text] : text.split(/(?<= )/);
  return parts.slice(0, Math.round(parts.length * clamp01(p))).join('');
}

/** Chapter 3 (13 beats): the flat Moon circled, a note typed beside it and sent; then the picture wiped from before to
 * after (its surface), the camera closing on the Moon's face. */
export function Circle({u}: {u: number}) {
  const CX = 952, CY = 456;  // the Moon, in the film's frame
  const close = ease(u, b(8), b(11), 0, 1, Easing.inOutCubic);
  const k = 1 + 0.03 * clamp01(u / b(8)) + 0.35 * close;
  const wipe = ease(u, b(9.2), b(10.4), 0, 100, Easing.inOutCubic);
  const draw = ease(u, b(1), b(2.4), 0, 1, Easing.inOutCubic);
  const gone = ease(u, b(7.6), b(8.4));
  const noteIn = spring(u, b(2.6), 0.5, 0.35);
  const L = 2 * Math.PI * Math.sqrt((375 * 375 + 375 * 375) / 2);
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${CX}px ${CY}px`, transform: `scale(${k})`}}>
        <img src={before} style={{position: 'absolute', inset: 0, width: 1920, height: 1080}} />
        <img src={after} style={{position: 'absolute', inset: 0, width: 1920, height: 1080, clipPath: `inset(0 ${100 - wipe}% 0 0)`}} />
        {wipe > 0 && wipe < 100 && <div style={{position: 'absolute', top: 0, bottom: 0, left: `${wipe}%`, width: 5, background: '#fff',
          boxShadow: '0 0 24px rgba(255,255,255,0.6)'}} />}
        <svg width="1920" height="1080" style={{position: 'absolute', inset: 0, opacity: 1 - gone}}>
          <ellipse cx={CX} cy={CY} rx="375" ry="375" fill="none" stroke={VERMILION} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={L} strokeDashoffset={L * (1 - draw)} transform={`rotate(-4 ${CX} ${CY})`} />
        </svg>
      </div>
      <div style={{...PANEL, position: 'absolute', left: 1380, top: 250, width: 480, padding: '40px 40px 30px', boxSizing: 'border-box',
        opacity: noteIn * (1 - gone), transform: `translateY(${(1 - noteIn) * 50 - gone * 40}px)`}}>
        <div style={{font: `${zh ? 500 : 400} 42px/1.32 ${SANS}`, color: INK, minHeight: 222}}>{typed(NOTE[LANG], (u - b(3)) / b(3))}</div>
        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: 16}}><Send press={u - b(7)} size={76} /></div>
      </div>
      <Pill text={zh ? '改前' : 'Before'} show={Math.min((u - b(8)) / 0.3, 1 - (u - b(9.2)) / 0.2)} />
      <Pill text={zh ? '改后' : 'After'} show={(u - b(10.4)) / 0.3} />
    </div>
  );
}

// Each mark on its tile, as the title card shows them: the agents' own art on ink, the services' icons inverted on their colours.
const LOGOS: Record<string, [string, string, boolean]> = {Codex: [codex, INK, false], 'Claude Code': [claude, INK, false],
  Gemini: [gemini, '#8E75B2', true], DeepSeek: [deepseek, '#5786FE', true]};

/** Chapter 4 (10 beats): the agent menu, large: the choice steps down its rows on the beat and lands on Claude Code,
 * whose models then come out one by one. */
export function Agents({u}: {u: number}) {
  const inP = spring(u, -b(0.6), 0.6, 0.3);
  const at = u < b(1) ? -1 : Math.min(3, Math.floor(u / BEAT) - 1);
  const on = u >= b(5) ? 1 : at;
  const chosen = u >= b(5);
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER}}>
      <div style={{...PANEL, position: 'absolute', left: 510, top: 120, width: 900, padding: 22, boxSizing: 'border-box',
        opacity: clamp01(inP * 1.5), transform: `translateY(${(1 - inP) * 70}px)`}}>
        {AGENT_ROWS.map(([name, by], i) => {
          const lit = i === on;
          return (
            <div key={name} style={{display: 'flex', alignItems: 'center', gap: 30, padding: '22px 30px', borderRadius: 22,
              background: lit ? (chosen ? 'rgba(196,56,31,0.12)' : 'rgba(42,38,34,0.06)') : 'transparent'}}>
              <span style={{width: 76, height: 76, borderRadius: 18, background: LOGOS[name]![1], display: 'grid', placeItems: 'center', flex: 'none'}}>
                <img src={LOGOS[name]![0]} style={{width: LOGOS[name]![2] ? 44 : 54, height: LOGOS[name]![2] ? 44 : 54, filter: LOGOS[name]![2] ? 'invert(1)' : undefined}} />
              </span>
              <div>
                <div style={{font: `700 50px ${SANS}`, color: INK, letterSpacing: '-0.01em'}}>{name}</div>
                <div style={{font: `500 28px ${SANS}`, color: MUTED, marginTop: 4}}>{by[LANG]}</div>
              </div>
              {lit && chosen && <svg style={{marginLeft: 'auto', transform: `scale(${spring(u, b(5), 0.4, 0.6)})`}} width="56" height="56"
                viewBox="0 0 24 24" fill="none" stroke={VERMILION} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 820, display: 'flex', justifyContent: 'center', gap: 22}}>
        {MODELS.map((m, i) => {
          const p = spring(u, b(6 + i * 0.5), 0.45, 0.5);
          const pick = m.startsWith('Opus') && u >= b(8.5);
          return (
            <div key={m} style={{font: `700 40px ${SANS}`, padding: '18px 36px', borderRadius: 999, opacity: clamp01(p * 2),
              transform: `translateY(${(1 - p) * 40}px) scale(${pick ? 1 + 0.08 * spring(u, b(8.5), 0.4, 0.6) : 1})`,
              background: pick ? VERMILION : '#fff', color: pick ? '#fff' : INK, boxShadow: '0 12px 30px rgba(42,38,34,0.12)'}}>{m}</div>
          );
        })}
      </div>
    </div>
  );
}

/** Chapter 5 (7 beats): three voices, large; the choice steps down and lands on one, which speaks (its waveform moves). */
export function Voices({u}: {u: number}) {
  const inP = spring(u, -b(0.6), 0.6, 0.3);
  const on = u < b(1) ? -1 : u < b(3) ? Math.min(2, Math.floor(u / BEAT)) : 0;
  const chosen = u >= b(3);
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER}}>
      <div style={{...PANEL, position: 'absolute', left: 410, top: 230, width: 1100, padding: 22, boxSizing: 'border-box',
        opacity: clamp01(inP * 1.5), transform: `translateY(${(1 - inP) * 70}px)`}}>
        {VOICES.map(([name, kind], i) => {
          const lit = i === on;
          const speaking = lit && chosen;
          return (
            <div key={name} style={{display: 'flex', alignItems: 'center', gap: 30, padding: '26px 30px', borderRadius: 22,
              background: lit ? (chosen ? 'rgba(196,56,31,0.12)' : 'rgba(42,38,34,0.06)') : 'transparent'}}>
              <div style={{width: 76, height: 76, borderRadius: '50%', flex: 'none', background: speaking ? VERMILION : 'rgba(42,38,34,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill={speaking ? '#fff' : INK}><path d="M7 4.5v15l12-7.5z" /></svg>
              </div>
              <div>
                <div style={{font: `700 50px ${SANS}`, color: INK, letterSpacing: '-0.01em'}}>{name}</div>
                <div style={{font: `500 28px ${SANS}`, color: MUTED, marginTop: 4}}>{kind[LANG]}</div>
              </div>
              {speaking && <Bars u={u - b(3)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Bars({u}: {u: number}) {
  return (
    <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, height: 80}}>
      {Array.from({length: 14}, (_, i) => {
        const h = 14 + 60 * Math.abs(Math.sin(u * 7 + i * 0.9) * Math.sin(u * 3.1 + i * 0.37));
        return <div key={i} style={{width: 9, height: h * clamp01(u / 0.25), borderRadius: 5, background: VERMILION}} />;
      })}
    </div>
  );
}

/** Chapter 6 (8 beats): the export button pressed; the film, a file, comes out. */
export function Export({u}: {u: number}) {
  const inP = spring(u, -b(0.6), 0.6, 0.3);
  const out = ease(u, b(1.3), b(2), 0, 1, Easing.inCubic);
  const file = spring(u, b(2), 0.6, 0.35);
  const press = u - b(1);
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER}}>
      {out < 1 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center',
          opacity: clamp01(inP * 1.5) * (1 - out), transform: `translateY(${(1 - inP) * 60}px) scale(${(press >= 0 && press < 0.18 ? 0.94 : 1) * (1 - 0.2 * out)})`}}>
          <div style={{position: 'relative', display: 'flex', alignItems: 'center', gap: 22, padding: '30px 60px', borderRadius: 999,
            background: VERMILION, color: '#fff', font: `800 60px ${SANS}`, boxShadow: '0 18px 40px rgba(196,56,31,0.35)'}}>
            <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            {zh ? '导出 MP4' : 'Export MP4'}
          </div>
        </div>
      )}
      {u >= b(2) && (
        <div style={{...PANEL, position: 'absolute', left: 360, top: 330, width: 1200, padding: 34, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', gap: 44, opacity: clamp01(file * 1.5), transform: `translateY(${(1 - file) * 80}px) scale(${0.94 + 0.06 * file})`}}>
          <img src={final} style={{width: 512, height: 288, borderRadius: 20, objectFit: 'cover'}} />
          <div>
            <div style={{font: `700 46px/1.2 ${SANS}`, color: INK, letterSpacing: '-0.01em'}}>{EXPORT_FILE.name}</div>
            <div style={{font: `500 32px ${SANS}`, color: MUTED, marginTop: 14}}>{EXPORT_FILE.meta[LANG]}</div>
            <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 30, padding: '12px 26px', borderRadius: 999,
              background: 'rgba(196,56,31,0.12)', color: VERMILION, font: `700 32px ${SANS}`, transform: `scale(${spring(u, b(3), 0.4, 0.6)})`}}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={VERMILION} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              {zh ? '已保存' : 'Saved'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
