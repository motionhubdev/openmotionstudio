import {useTime, Easing, interpolate} from '@motionhub/runtime';
import {C, FACE, T, ramp, Sun} from './kit';
import {STAGE} from './orbit';

// Day length at Beijing (39.9 deg N), a calculation from the tilt with refraction allowed for: about 15 hours at the
// June solstice, about 9 hours 20 minutes at the December solstice.
const DAYS = [
  {key: 'summer', name: '夏至', hours: 15, colour: C.warm},
  {key: 'winter', name: '冬至', hours: 9.3, colour: C.cold},
];

const SKY = {cx: 430, cy: 470};
const ARCS = {summer: {rx: 400, ry: 330}, winter: {rx: 270, ry: 150}};

const arcPath = ({rx, ry}: {rx: number; ry: number}) => `M ${SKY.cx - rx} ${SKY.cy} A ${rx} ${ry} 0 0 1 ${SKY.cx + rx} ${SKY.cy}`;

/**
 * The day's sky and its length. Left: the sun's path over a horizon, high and wide in summer, low and short in winter.
 * Right: two 24-hour bars, the daylight in each counted up for Beijing.
 */
export function Daylight() {
  const t = useTime();
  const summer = ramp(t, 0.5, 2.6);
  const winter = ramp(t, 1.6, 3.2);
  const sumLen = Math.PI * (ARCS.summer.rx + ARCS.summer.ry) / 2;
  const winLen = Math.PI * (ARCS.winter.rx + ARCS.winter.ry) / 2;
  const sunAt = (arc: {rx: number; ry: number}, p: number) => ({
    x: SKY.cx - arc.rx * Math.cos(Math.PI * p),
    y: SKY.cy - arc.ry * Math.sin(Math.PI * p),
  });
  const s = sunAt(ARCS.summer, Math.min(summer, 0.5) );
  const w = sunAt(ARCS.winter, Math.min(winter, 0.5));
  return (
    <div style={{display: 'flex', width: STAGE.w, height: STAGE.h}}>
      <svg width={880} height={STAGE.h} viewBox={`0 0 880 ${STAGE.h}`} style={{display: 'block', flex: 'none'}}>
        <path d={arcPath(ARCS.summer)} fill="none" stroke={C.warm} strokeWidth={6} strokeDasharray={sumLen} strokeDashoffset={sumLen * (1 - summer)} />
        <path d={arcPath(ARCS.winter)} fill="none" stroke={C.cold} strokeWidth={6} strokeDasharray={winLen} strokeDashoffset={winLen * (1 - winter)} />
        <g opacity={ramp(t, 0.3, 0.7)}><Sun cx={s.x} cy={s.y} r={40} /></g>
        <g opacity={ramp(t, 1.6, 2.0) * 0.8}><Sun cx={w.x} cy={w.y} r={30} glow={0.5} /></g>
        <text x={s.x} y={s.y - 62} textAnchor="middle" fill={C.warm} opacity={ramp(t, 2.0, 2.5)} style={{font: `700 ${T.label}px ${FACE}`}}>夏至</text>
        <text x={w.x} y={w.y - 52} textAnchor="middle" fill={C.cold} opacity={ramp(t, 2.6, 3.1)} style={{font: `700 ${T.label}px ${FACE}`}}>冬至</text>
        <rect x={0} y={SKY.cy} width={880} height={90} fill={C.land} opacity={0.55} />
        <text x={SKY.cx} y={SKY.cy + 150} textAnchor="middle" fill={C.dim} style={{font: `400 ${T.note}px ${FACE}`}}>太阳一天走过的路（示意）</text>
      </svg>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 56, paddingLeft: 40}}>
        <div style={{font: `700 ${T.label}px ${FACE}`, color: C.ink}}>北京 · 一天 24 小时里的白天</div>
        {DAYS.map((d, i) => {
          const from = 4.6 + i * 0.6;
          const h = interpolate(t, [from, from + 1.4], [0, d.hours], {easing: Easing.outQuart, clamp: true});
          return (
            <div key={d.key}>
              <div style={{display: 'flex', justifyContent: 'space-between', font: `700 ${T.label}px ${FACE}`, color: d.colour, marginBottom: 14}}>
                <span>{d.name}</span>
                <span>{`约 ${h.toFixed(d.hours % 1 ? 1 : 0)} 小时`}</span>
              </div>
              <div style={{height: 56, borderRadius: 10, background: C.faint, overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${(h / 24) * 100}%`, background: d.colour}} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
