import {useTime, Easing, interpolate} from '@motionhub/runtime';
import {C, FACE, T, ramp, Sun} from './kit';
import {STAGE} from './orbit';

const GROUND = 500;
const X0 = 840;
const BEAM = 260;
const RAYS = 5;

/**
 * Direct and slanting light, an illustration. One beam of sunlight of fixed width falls on the ground. Straight down,
 * it lights a narrow patch, hot. Then the sun sinks to 30 degrees above the horizon: the same beam spreads over twice
 * the ground, and the patch cools.
 */
export function Light() {
  const t = useTime();
  const slant = ramp(t, 4.4, 6.2);
  const phi = (slant * 60 * Math.PI) / 180;
  const foot = BEAM / Math.cos(phi);
  const dx = Math.sin(phi);
  const dy = Math.cos(phi);
  const L = 330;
  const left = X0 - foot / 2;
  const right = X0 + foot / 2;
  const beam = `M ${left} ${GROUND} L ${right} ${GROUND} L ${right - dx * L} ${GROUND - dy * L} L ${left - dx * L} ${GROUND - dy * L} Z`;
  const sun = {x: X0 - dx * 410, y: GROUND - dy * 410};
  const heat = ramp(t, 0.8, 1.6, Easing.outCubic) * (1 - 0.6 * slant);
  const hotLabel = ramp(t, 1.4, 1.9, Easing.outCubic) * (1 - ramp(t, 4.2, 4.5));
  const coolLabel = ramp(t, 6.0, 6.5, Easing.outCubic);
  const area = interpolate(t, [4.4, 6.2], [1, 2], {easing: Easing.inOutCubic, clamp: true});
  const patchColour = slant < 0.5 ? C.warm : C.sun;
  return (
    <svg width={STAGE.w} height={STAGE.h} viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} style={{display: 'block'}}>
      <path d={beam} fill={C.sunGlow} opacity={0.55} />
      {Array.from({length: RAYS}, (_, i) => {
        const f = (i + 0.5) / RAYS;
        const gx = left + f * foot;
        return <line key={i} x1={gx - dx * (L - 40)} y1={GROUND - dy * (L - 40)} x2={gx} y2={GROUND - 6} stroke={C.sun} strokeWidth={5} opacity={0.9} />;
      })}
      <Sun cx={sun.x} cy={sun.y} r={46} />
      <rect x={60} y={GROUND} width={1560} height={70} fill={C.land} opacity={0.55} />
      <rect x={Math.round(left)} y={GROUND} width={Math.round(foot)} height={22} fill={patchColour} opacity={0.35 + 0.6 * heat} />
      <rect x={X0 - BEAM / 2} y={GROUND - 4} width={BEAM} height={30} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="10 8" opacity={ramp(t, 4.6, 5.2)} />
      <text x={X0} y={GROUND + 140} textAnchor="middle" fill={C.ink} style={{font: `700 ${T.label}px ${FACE}`}}>{`照到的地面 × ${area.toFixed(1)}`}</text>
      <text x={X0 + foot / 2 + 40} y={GROUND - 30} fill={C.warm} opacity={hotLabel} style={{font: `700 ${T.label}px ${FACE}`}}>集中 → 热</text>
      <text x={X0 + foot / 2 + 40} y={GROUND - 30} fill={C.cold} opacity={coolLabel} style={{font: `700 ${T.label}px ${FACE}`}}>铺开 → 凉</text>
      <text x={1600} y={40} textAnchor="end" fill={C.dim} style={{font: `400 ${T.note}px ${FACE}`}}>示意图</text>
    </svg>
  );
}
