// Look: the sky just after a summer storm, seen with the sun at your back — a deep slate storm-cloud ground #18202E,
// rain-washed ink #F3F0E8, warm sunlight #FFD98A for every ray of white light, and the rainbow's own spectrum as the
// only colour; red #FF5446 is the focus (the 42° ray) whenever one thing must be picked out. Noto Sans SC at 700 for
// headings and 400 for labels.
import type {ReactNode} from 'react';
import {interpolate, Easing, useTime} from '@motionhub/runtime';

export const C = {
  ground: '#18202E',
  cloud: '#232D3F',
  panel: '#202A3B',
  ink: '#F3F0E8',
  dim: '#8E97A8',
  sun: '#FFD98A',
  red: '#FF5446',
  drop: '#9CC8E8',
  land: '#2A3A33',
};

/** The rainbow from outside (red) to inside (violet). */
export const SPECTRUM = ['#FF5446', '#FF9A3C', '#FFD84A', '#5ED47A', '#4AA8FF', '#5B6CFF', '#A070FF'];

export const FACE = "'Noto Sans SC', sans-serif";

/** The type scale: five sizes. */
export const T = {cover: 132, head: 96, figure: 120, label: 48, small: 40};

/** The frame's boxes, the same in every scene (portrait 1080 × 1920; the foot is the caption's and the platform's). */
export const BOX = {
  head: {x: 80, y: 150, w: 920, h: 220},
  figure: {x: 40, y: 400, w: 1000, h: 1040},
};

export const captionTokens = {
  caption: {
    font: FACE,
    size: 54,
    weight: 700,
    color: C.ink,
    background: 'rgba(10, 14, 22, 0.78)',
    radius: 18,
    'padding-y': 16,
    'padding-x': 30,
    bottom: 300,
  },
};

/** Fade and rise in over the scene's first half second (`cover` draws it already there). */
export function useEnter(cover = false, delay = 0) {
  const t = useTime();
  if (cover) return {opacity: 1, transform: 'none'};
  const k = interpolate(t, [delay, delay + 0.5], [0, 1], {easing: Easing.outCubic, clamp: true});
  return {opacity: k, transform: `translateY(${Math.round((1 - k) * 28)}px)`};
}

/** A scene's heading, in the same box every time. */
export function Heading({children, cover = false, size = T.head}: {children: ReactNode; cover?: boolean; size?: number}) {
  const style = useEnter(cover);
  return (
    <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      font: `700 ${size}px/1.15 ${FACE}`, color: C.ink, letterSpacing: '0.02em', ...style}}>
      {children}
    </div>
  );
}

/** A label drawn in the figure's own coordinates (SVG text). */
export function Label({x, y, children, color = C.ink, size = T.label, anchor = 'middle', opacity = 1, weight = 400}:
  {x: number; y: number; children: ReactNode; color?: string; size?: number; anchor?: 'start' | 'middle' | 'end'; opacity?: number; weight?: number}) {
  return (
    <text x={x} y={y} fill={color} fontFamily={FACE} fontSize={size} fontWeight={weight} textAnchor={anchor} opacity={opacity}
      dominantBaseline="middle">{children}</text>
  );
}

/** An ease that always clamps. */
export function ease(t: number, input: number[], output: number[], easing = Easing.inOutCubic) {
  return interpolate(t, input, output, {easing, clamp: true});
}

/** A closed arrowhead as one filled shape, pointing along (dx, dy) with its tip at (x, y). */
export function arrowHead(x: number, y: number, dx: number, dy: number, size = 26) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const bx = x - ux * size, by = y - uy * size;
  const px = -uy * size * 0.5, py = ux * size * 0.5;
  return `M${x},${y} L${bx + px},${by + py} L${bx - px},${by - py} Z`;
}
