import type {ReactNode} from 'react';
import {C, FACE, T, Sun, Earth} from './kit';

/** The stage's size: every scene's picture is drawn in it. */
export const STAGE = {w: 1680, h: 666};

/** The orbit seen from above at a slant: the true one is nearly round with the sun at its middle. */
const TRUE = {cx: 840, cy: 380, rx: 520, ry: 215, sun: 840};
/** The orbit people imagine: long and flat, the sun near one end. An illustration, drawn far flatter than any orbit. */
const MYTH = {cx: 840, cy: 380, rx: 660, ry: 150, sun: 1300};

const mix = (a: number, b: number, p: number) => a + (b - a) * p;

export function orbitShape(myth: number) {
  return {
    cx: mix(TRUE.cx, MYTH.cx, myth),
    cy: mix(TRUE.cy, MYTH.cy, myth),
    rx: mix(TRUE.rx, MYTH.rx, myth),
    ry: mix(TRUE.ry, MYTH.ry, myth),
    sun: mix(TRUE.sun, MYTH.sun, myth),
  };
}

/** A point on the orbit at angle `a` (0 is the right end, PI the left). */
export function onOrbit(myth: number, a: number) {
  const o = orbitShape(myth);
  return {x: o.cx + o.rx * Math.cos(a), y: o.cy + o.ry * Math.sin(a)};
}

/** A label's width at the label size: full width for Chinese, about half for Latin letters and digits. */
const labelWidth = (text: string) => [...text].reduce((w, c) => w + (c.charCodeAt(0) > 0x2000 ? T.label : T.label * 0.56), 0);

/** A label pinned to a point, on a paper plate so the orbit's dashes never run through it. */
export function Tag({x, y, color, opacity, align = 'middle', children}: {x: number; y: number; color: string; opacity: number; align?: 'start' | 'middle' | 'end'; children: string}) {
  const w = labelWidth(children) + 28;
  const left = align === 'start' ? x - 14 : align === 'end' ? x - w + 14 : x - w / 2;
  return (
    <g opacity={opacity}>
      <rect x={Math.round(left)} y={Math.round(y - T.label * 0.95)} width={Math.round(w)} height={Math.round(T.label * 1.3)} rx={10} fill={C.paper} />
      <text x={Math.round(x)} y={Math.round(y)} textAnchor={align} fill={color} style={{font: `700 ${T.label}px ${FACE}`}}>
        {children}
      </text>
    </g>
  );
}

/** The orbit, the sun and the Earth at `earth` (an angle), the orbit `myth` of the way to the imagined one. */
export function Orbit({myth, earth, earthTint, earthTintOpacity = 0, children}: {myth: number; earth: number; earthTint?: string; earthTintOpacity?: number; children?: ReactNode}) {
  const o = orbitShape(myth);
  const e = onOrbit(myth, earth);
  return (
    <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{display: 'block'}}>
      <ellipse cx={o.cx} cy={o.cy} rx={o.rx} ry={o.ry} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="14 12" opacity={0.55} />
      <Sun cx={o.sun} cy={o.cy} r={70} />
      {children}
      <Earth cx={e.x} cy={e.y} r={44} tilt={0} axis={0} north={earthTint} south={earthTint} northOpacity={earthTintOpacity} southOpacity={earthTintOpacity} />
    </svg>
  );
}
