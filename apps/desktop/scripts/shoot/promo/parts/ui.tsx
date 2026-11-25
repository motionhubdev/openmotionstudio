// The Studio at work: the take's seconds for a chapter, the camera on the part in use (each cut punches in a little),
// a panel lifted off the dimmed screen while it matters, and a ring where the pointer clicks. Everything is placed in the
// take's own 1920x1080 pixels, inside the camera.
import type {ReactNode} from 'react';
import {Video, Easing} from '@motionhub/runtime';
import {TAGS} from './words';
import {LANG, NIGHT, PAPER, SANS, VERMILION, clamp01, ease, spring} from './kit';

type Rect = [number, number, number, number];
export interface Shot {
  uiStart: number;
  uiLen: number;
  cams: {t: number; rect: Rect}[];
  lifts: {a: number; b: number; rect: Rect}[];
  clicks: {t: number; x: number; y: number}[];
  tags: boolean;
}

/** The camera at `u` seconds into the clip: scale and offset that frame its rectangle, punched in just after a cut. */
function camera(shot: Shot, u: number) {
  const i = Math.max(0, shot.cams.findLastIndex((c) => c.t <= u + 1e-6));
  const {t, rect} = shot.cams[i]!;
  const [x, y, w, h] = rect;
  const punch = i === 0 ? 1 + 0.07 * (1 - ease(u, 0, 1.4, 0, 1, Easing.outCubic)) : 1 + 0.05 * (1 - ease(u, t, t + 0.4, 0, 1, Easing.outCubic));
  const k = (1920 / Math.max(w, (h * 16) / 9)) * punch;
  const cx = x + w / 2, cy = y + h / 2;
  return {k, tx: 960 - cx * k, ty: 540 - cy * k};
}

function Frame({k, tx, ty, children}: {k: number; tx: number; ty: number; children: ReactNode}) {
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${k})`}}>
      {children}
    </div>
  );
}

export function Studio({clip, shot, t}: {clip: string; shot: Shot; t: number}) {
  const u = t - shot.uiStart;
  if (u < 0) return null;
  const cam = camera(shot, u);
  const lift = shot.lifts
    .map((l) => ({...l, p: Math.min(spring(u, l.a, 0.5, 0.4), 1 - ease(u, l.b - 0.05, l.b + 0.25))}))
    .find((l) => l.p > 0.001);
  const base = (
    <Frame {...cam}>
      <Video src={clip} startAt={shot.uiStart} />
      {shot.clicks.map((c, i) => <Click key={i} u={u} c={c} k={cam.k} />)}
      {shot.tags && <Tags u={u} k={cam.k} />}
    </Frame>
  );
  const picture = (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: NIGHT}}>
      {base}
      {lift && (
        <>
          <div style={{position: 'absolute', inset: 0, background: `rgba(15,13,11,${0.6 * lift.p})`}} />
          <Lifted clip={clip} shot={shot} cam={cam} rect={lift.rect} p={lift.p} />
        </>
      )}
    </div>
  );
  return shot.tags ? <FlyIn u={u}>{picture}</FlyIn> : picture;
}

/** A panel copied out of the picture, raised and enlarged a little over the dimmed rest, edged in vermilion. */
function Lifted({clip, shot, cam, rect, p}: {clip: string; shot: Shot; cam: ReturnType<typeof camera>; rect: Rect; p: number}) {
  const [x, y, w, h] = rect;
  const sx = cam.tx + (x + w / 2) * cam.k, sy = cam.ty + (y + h / 2) * cam.k;
  const s = 1 + Math.min(0.09, Math.max(0, 1840 / (w * cam.k) - 1)) * p;
  const pad = 10;
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: `${sx}px ${sy}px`, transform: `scale(${s}) translateY(${-14 * p}px)`,
      filter: `drop-shadow(0 ${30 * p}px ${50 * p}px rgba(0,0,0,${0.55 * p}))`}}>
      <Frame {...cam}>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${y - pad}px ${1920 - x - w - pad}px ${1080 - y - h - pad}px ${x - pad}px round ${14 / cam.k}px)`}}>
          <Video src={clip} startAt={shot.uiStart} />
        </div>
        <div style={{position: 'absolute', left: x - pad, top: y - pad, width: w + 2 * pad, height: h + 2 * pad, borderRadius: 14 / cam.k,
          boxShadow: `0 0 0 ${4 / cam.k}px ${VERMILION}`, opacity: p}} />
      </Frame>
    </div>
  );
}

/** Where the pointer clicks: a dot that presses, and a ring that spreads. */
function Click({u, c, k}: {u: number; c: {t: number; x: number; y: number}; k: number}) {
  const d = u - c.t;
  if (d < -0.12 || d > 0.75) return null;
  const ring = ease(d, 0, 0.65, 0, 1, Easing.outCubic);
  const dot = d < 0 ? 1 + d * 2 : 1 - 0.25 * Math.sin(clamp01(d / 0.2) * Math.PI);
  const r = (18 + 80 * ring) / k;
  return (
    <>
      <div style={{position: 'absolute', left: c.x - r, top: c.y - r, width: 2 * r, height: 2 * r, borderRadius: '50%',
        border: `${6 / k}px solid ${VERMILION}`, opacity: d < 0 ? 0 : 1 - ring}} />
      <div style={{position: 'absolute', left: c.x - 16 / k, top: c.y - 16 / k, width: 32 / k, height: 32 / k, borderRadius: '50%',
        background: VERMILION, opacity: 0.85 * (1 - ease(d, 0.3, 0.75)), transform: `scale(${dot})`}} />
    </>
  );
}

/** The intro: the whole window flies in, tilted, settles flat, and its three parts are named. */
function FlyIn({u, children}: {u: number; children: ReactNode}) {
  const q = spring(u, 0.15, 1.1, 0.12);
  const full = ease(u, 2.3, 3.0, 0, 1, Easing.inOutCubic);
  const scale = (0.6 + 0.3 * q) * (1 - full) + full;
  return (
    <div style={{position: 'absolute', inset: 0, background: PAPER, perspective: 1800}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 22 * (1 - full), overflow: 'hidden',
        boxShadow: `0 ${50 * (1 - full)}px ${110 * (1 - full)}px rgba(42,38,34,${0.35 * (1 - full)})`,
        transform: `translateY(${(1 - q) * 260}px) rotateX(${(1 - q) * 32}deg) rotateZ(${(1 - q) * -5}deg) scale(${scale})`}}>
        {children}
      </div>
    </div>
  );
}

/** The intro's names for the three parts of the window. */
function Tags({u, k}: {u: number; k: number}) {
  const spots: [number, number][] = [[230, 470], [980, 300], [1000, 905]];
  return (
    <>
      {TAGS[LANG].map((name, i) => {
        const p = spring(u, 0.95 + i * 0.22, 0.5, 0.5);
        const out = ease(u, 2.2, 2.45);
        const [x, y] = spots[i]!;
        return (
          <div key={name} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${(p * (1 - out)) / k})`,
            font: `${LANG === 'zh' ? 900 : 800} 50px ${SANS}`, color: '#fff', background: VERMILION, borderRadius: 999, padding: '16px 34px',
            whiteSpace: 'nowrap', boxShadow: '0 16px 40px rgba(0,0,0,0.4)'}}>{name}</div>
        );
      })}
    </>
  );
}
