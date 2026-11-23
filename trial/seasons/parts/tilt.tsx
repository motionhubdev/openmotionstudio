import {useTime, Easing, interpolate} from '@motionhub/runtime';
import {C, FACE, T, ramp, Sun, Earth} from './kit';
import {STAGE} from './orbit';

/** Earth's axial tilt, in degrees. */
export const TILT = 23.4;

/** The orbit seen from the side at a slant, for the tilt and the seasons: the sun at its middle. */
export const SIDE = {cx: 840, cy: 350, rx: 650, ry: 225};

/** The four places on that orbit: June on the left (north pole leaning to the sun), then September, December, March. */
export const PLACES = [
  {key: 'june', a: Math.PI},
  {key: 'september', a: -Math.PI / 2},
  {key: 'december', a: 0},
  {key: 'march', a: Math.PI / 2},
] as const;

export const place = (a: number) => ({x: SIDE.cx + SIDE.rx * Math.cos(a), y: SIDE.cy + SIDE.ry * Math.sin(a)});

/** The orbit's ring and the sun, the far half behind the sun and the near half in front of it. */
export function SideOrbit({children}: {children?: React.ReactNode}) {
  const {cx, cy, rx, ry} = SIDE;
  return (
    <>
      <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="14 12" opacity={0.5} />
      <Sun cx={cx} cy={cy} r={62} />
      <path d={`M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="14 12" opacity={0.5} />
      {children}
    </>
  );
}

/**
 * The tilt. A large Earth whose axis leans from upright to 23.4 degrees, the angle drawn and counted beside it.
 * Then it shrinks onto the orbit, and three more Earths join it there, every axis leaning the same way.
 */
export function Tilt() {
  const t = useTime();
  const lean = ramp(t, 0.7, 2.3);
  const deg = interpolate(t, [0.7, 2.3], [0, TILT], {easing: Easing.inOutCubic, clamp: true});
  const shrink = ramp(t, 4.0, 5.1);
  const big = {x: 560, y: 330, r: 210};
  const june = place(Math.PI);
  const x = big.x + (june.x - big.x) * shrink;
  const y = big.y + (june.y - big.y) * shrink;
  const r = big.r + (56 - big.r) * shrink;
  const angleLabel = 1 - ramp(t, 3.8, 4.2);
  const orbit = ramp(t, 4.2, 4.8, Easing.outCubic);
  const arc = r * 1.25;
  const rad = (deg * Math.PI) / 180;
  return (
    <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{display: 'block'}}>
      <g opacity={orbit}>
        <SideOrbit>
          {PLACES.slice(1).map((p, i) => {
            const at = place(p.a);
            const show = ramp(t, 5.0 + i * 0.35, 5.5 + i * 0.35, Easing.outCubic);
            return <g key={p.key} opacity={show}><Earth cx={at.x} cy={at.y} r={56} tilt={TILT} /></g>;
          })}
        </SideOrbit>
      </g>
      <g opacity={angleLabel}>
        <line x1={x} y1={y - r * 1.5} x2={x} y2={y + r * 1.5} stroke={C.dim} strokeWidth={4} strokeDasharray="12 10" />
        {lean > 0.01 && (
          <path d={`M ${x} ${y - arc} A ${arc} ${arc} 0 0 1 ${x + arc * Math.sin(rad)} ${y - arc * Math.cos(rad)}`} fill="none" stroke={C.sun} strokeWidth={8} />
        )}
        <text x={x + 300} y={y - 150} fill={C.ink} style={{font: `700 ${T.cover}px ${FACE}`}}>{`${deg.toFixed(1)}°`}</text>
        <text x={x + 304} y={y - 70} fill={C.dim} style={{font: `400 ${T.label}px ${FACE}`}}>地轴偏离竖直的角度</text>
      </g>
      <Earth cx={x} cy={y} r={r} tilt={deg} />
    </svg>
  );
}
