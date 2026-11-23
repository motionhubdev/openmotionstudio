// Night Diagram's reading card (motions/@iamsuosi/night-diagram/react/parts/reading.tsx), copied here to add
// `decimals`: the motion's card rounds its figure to a whole number, and this film's figure is 29.5 days.
import {C, SANS, MONO, glide, smooth} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';

export function Reading({at, label, value, decimals = 0, unit = '', note, source, color = C.ink, show = 1, roll = 1}: {at: [number, number]; label: string; value: number; decimals?: number; unit?: string; note?: string; source?: string; color?: string; show?: number; roll?: number}) {
  const k = glide(show);
  if (k <= 0) return null;
  return (
    <div style={{position: 'absolute', left: at[0], top: at[1], padding: '22px 30px', borderRadius: 14, background: 'rgba(5, 10, 32, 0.86)', border: `2px solid ${C.line}`, fontFamily: SANS, opacity: k, transform: `translateY(${(1 - k) * 18}px)`, whiteSpace: 'nowrap'}}>
      <div style={{fontSize: 30, color: C.read}}>{label}</div>
      <div style={{fontSize: 104, fontWeight: 800, lineHeight: 1.1, color, fontVariantNumeric: 'tabular-nums'}}>
        {(value * smooth(roll)).toFixed(decimals)}{unit && <span style={{fontSize: 64, fontWeight: 700, marginLeft: 8}}>{unit}</span>}
      </div>
      {note && <div style={{fontSize: 28, color: C.read}}>{note}</div>}
      {source && <div style={{fontFamily: MONO, fontSize: 28, color: C.read, marginTop: 8}}>{source}</div>}
    </div>
  );
}
