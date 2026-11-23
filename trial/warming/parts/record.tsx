// The temperature record, 1850-2024, against the pre-industrial mean: one chart for two scenes.
// `record` draws it and marks the last decade; `when` starts from that picture and splits the rise before and after the 1970s.
import {Easing, useTime} from '@motionhub/runtime';
import {ANOMALY, FIRST_YEAR, mean} from './data.ts';
import {out, tween} from './kit.tsx';

const W = 1600, H = 560;
const PLOT = {left: 130, right: 1290, top: 24, bottom: 500};
const Y_MIN = -0.4, Y_MAX = 1.8;
const LAST = FIRST_YEAR + ANOMALY.length - 1;

const sx = (year: number) => Math.round(PLOT.left + ((year - FIRST_YEAR) / (LAST - FIRST_YEAR)) * (PLOT.right - PLOT.left));
const sy = (v: number) => Math.round(PLOT.bottom - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * (PLOT.bottom - PLOT.top));

const path = (from: number, to: number) =>
  ANOMALY.slice(from - FIRST_YEAR, to - FIRST_YEAR + 1).map((v, i) => `${i ? 'L' : 'M'}${sx(from + i)} ${sy(v)}`).join('');
const ALL = path(FIRST_YEAR, LAST);
const EARLY = path(FIRST_YEAR, 1975);
const LATE = path(1975, LAST);
/** How long the full line is, for drawing it on: the sum of its segments */
const LENGTH = Math.ceil(ANOMALY.slice(1).reduce((s, v, i) => s + Math.hypot(sx(FIRST_YEAR + i + 1) - sx(FIRST_YEAR + i), sy(v) - sy(ANOMALY[i]!)), 0));

const RECENT = mean(2015, 2024); // 1.33
const SEVENTIES = mean(1970, 1979); // 0.35

const TICKS_Y = [0, 0.5, 1, 1.5];
const TICKS_X = [1850, 1900, 1950, 2000, 2024];
const label = {fontFamily: 'var(--font-sans)', fill: 'var(--color-muted)', fontSize: 28} as const;

/** A vertical bracket from v0 to v1 at year x, with its figure and its span beside it */
function Rise({year, v0, v1, figure, span, color, show, textAt}: {year: number; v0: number; v1: number; figure: string; span: string; color: string; show: number; textAt?: number}) {
  const x = sx(year) + 26, y0 = sy(v0), y1 = sy(v1), mid = textAt === undefined ? Math.round((y0 + y1) / 2) : sy(textAt);
  const grow = Math.round((y0 - y1) * show);
  return (
    <g>
      <path d={`M${x - 10} ${y0}H${x}V${y0 - grow}H${x - 10}`} fill="none" stroke={color} strokeWidth={3} />
      <g opacity={tween(show, 0.6, 1, 0, 1)}>
        <text x={x + 22} y={mid - 4} fontFamily="var(--font-display)" fontWeight={800} fontSize={64} fill={color}>{figure}</text>
        <text x={x + 24} y={mid + 38} {...label} fontSize={30}>{span}</text>
      </g>
    </g>
  );
}

export function Record({mode}: {mode: 'record' | 'when'}) {
  const t = useTime();
  const drawn = mode === 'record' ? tween(t, 0.6, 4.6, 0, 1, Easing.inOutCubic) : 1;
  // record, second line: the last decade and 2024
  const decade = mode === 'record' ? tween(t, 6.0, 7.0, 0, 1) : 1;
  const count = mode === 'record' ? tween(t, 6.0, 7.2, 0, RECENT, out) : RECENT;
  const year2024 = mode === 'record' ? tween(t, 7.4, 7.8, 0, 1) : 1;
  // when: the line splits at the 1970s, then each part's rise is measured
  const split = mode === 'when' ? tween(t, 0.6, 1.8, 0, 1) : 0;
  const early = mode === 'when' ? tween(t, 4.8, 5.8, 0, 1) : 0;
  const late = mode === 'when' ? tween(t, 5.8, 6.8, 0, 1) : 0;
  const decadeFade = 1 - split; // the decade mark gives way to the split

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{overflow: 'visible'}}>
      {/* axes: gridlines at each half degree, the zero line is the 1850-1900 mean */}
      {TICKS_Y.map((v) => (
        <g key={v}>
          <line x1={PLOT.left} x2={PLOT.right} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? 'var(--color-muted)' : 'var(--color-faint)'} strokeWidth={v === 0 ? 2 : 1.5} />
          <text x={PLOT.left - 18} y={sy(v) + 10} textAnchor="end" {...label}>{v === 0 ? '0' : `+${v.toFixed(1)}`}</text>
        </g>
      ))}
      <text x={PLOT.left - 18} y={PLOT.top - 2} textAnchor="end" {...label} fontSize={26}>°C</text>
      <text x={sx(LAST)} y={sy(0) + 40} textAnchor="end" {...label} fontSize={26}>0 = 1850–1900 年平均（工业化前）</text>
      {TICKS_X.map((y) => (
        <text key={y} x={sx(y)} y={PLOT.bottom + 48} textAnchor="middle" {...label}>{y}</text>
      ))}
      <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} stroke="var(--color-faint)" strokeWidth={1.5} />

      {/* the record: there faintly from the start, drawn on in warm white */}
      <path d={ALL} fill="none" stroke="var(--color-muted)" strokeOpacity={0.35} strokeWidth={3} strokeLinejoin="round" />
      {mode === 'record' ? (
        <path d={ALL} fill="none" stroke="var(--color-text)" strokeWidth={3.5} strokeLinejoin="round" strokeDasharray={LENGTH} strokeDashoffset={Math.round(LENGTH * (1 - drawn))} />
      ) : (
        <>
          <path d={EARLY} fill="none" stroke="var(--color-text)" strokeOpacity={1 - 0.55 * split} strokeWidth={3.5} strokeLinejoin="round" />
          <path d={LATE} fill="none" stroke={split > 0.5 ? 'var(--color-data)' : 'var(--color-text)'} strokeWidth={3.5 + split} strokeLinejoin="round" />
        </>
      )}

      {/* the last decade's mean, 2015-2024 */}
      <g opacity={decade * decadeFade}>
        <line x1={sx(2015)} x2={sx(2024)} y1={sy(RECENT)} y2={sy(RECENT)} stroke="var(--color-data)" strokeWidth={6} />
        <text x={sx(2024) + 30} y={sy(RECENT) + 24} fontFamily="var(--font-display)" fontWeight={800} fontSize={84} fill="var(--color-data)">+{count.toFixed(1)} °C</text>
        <text x={sx(2024) + 32} y={sy(RECENT) + 66} {...label} fontSize={30}>2015–2024 年平均</text>
      </g>
      <g opacity={year2024 * decadeFade}>
        <circle cx={sx(2024)} cy={sy(ANOMALY[ANOMALY.length - 1]!)} r={8} fill="var(--color-text)" />
        <text x={sx(2024) + 30} y={sy(ANOMALY[ANOMALY.length - 1]!) - 22} {...label} fill="var(--color-text)" fontSize={30}>2024 年：+1.6 °C</text>
      </g>

      {/* when: the two rises, before and after the 1970s, from decade means */}
      {mode === 'when' && (
        <>
          <line x1={sx(1970)} x2={sx(1979)} y1={sy(SEVENTIES)} y2={sy(SEVENTIES)} stroke="var(--color-text)" strokeWidth={5} opacity={early} />
          <line x1={sx(2015)} x2={sx(2024)} y1={sy(RECENT)} y2={sy(RECENT)} stroke="var(--color-data)" strokeWidth={6} opacity={late} />
          <line x1={sx(FIRST_YEAR)} x2={sx(LAST)} y1={sy(SEVENTIES)} y2={sy(SEVENTIES)} stroke="var(--color-text)" strokeWidth={1.5} strokeDasharray="8 8" opacity={early * 0.7} />
          <Rise year={1900} v0={0} v1={SEVENTIES} figure={`+${SEVENTIES.toFixed(2)} °C`} span="约一百年（到 1970 年代）" color="var(--color-text)" show={early} textAt={0.78} />
          <Rise year={2024} v0={SEVENTIES} v1={RECENT} figure={`+${(RECENT - SEVENTIES).toFixed(1)} °C`} span="约五十年" color="var(--color-data)" show={late} />
        </>
      )}
    </svg>
  );
}

/** The record as one quiet line for the cover: already drawn at frame 0, no axes, no figures */
export function RecordSilhouette() {
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={PLOT.left} x2={PLOT.right} y1={sy(0)} y2={sy(0)} stroke="var(--color-faint)" strokeWidth={2} />
      <path d={ALL} fill="none" stroke="var(--color-muted)" strokeWidth={3} strokeLinejoin="round" />
      <circle cx={sx(LAST)} cy={sy(ANOMALY[ANOMALY.length - 1]!)} r={9} fill="var(--color-text)" />
      <text x={sx(FIRST_YEAR)} y={PLOT.bottom + 48} {...label}>1850</text>
      <text x={sx(LAST)} y={PLOT.bottom + 48} textAnchor="middle" {...label}>2024</text>
    </svg>
  );
}
