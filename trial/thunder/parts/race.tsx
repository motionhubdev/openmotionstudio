// Scene 3: a race over 3 km from the strike to the house. Light is there at once; sound crawls at its true pace.
import {interpolate, Easing, useTime} from '@motionhub/runtime';
import {C, T, boltPath, useIn, useSaid} from './kit';

const KM = 3;
const SOUND = 0.34; // km a second
const LANE_X0 = 220;
const LANE_X1 = 1460;

function Lane({y, color, label, value, unit, reach, front, named}: {
  y: number; color: string; label: string; value: string; unit: string; reach: number; front: boolean; named: number;
}) {
  const x = Math.round(LANE_X0 + (LANE_X1 - LANE_X0) * reach);
  return (
    <g>
      {/* the empty track is there from the start; its name and speed arrive with its line */}
      <g opacity={named}>
        <text x={LANE_X0} y={y - 46} fill={color} style={{font: T.figure.font}}>{label}</text>
        <text x={LANE_X0 + 100} y={y - 46} fill={C.ink} style={{font: T.label.font}}>{value}<tspan fill={C.dim}> {unit}</tspan></text>
      </g>
      <rect x={LANE_X0} y={y - 10} width={LANE_X1 - LANE_X0} height={20} rx={10} fill={C.panel} />
      {reach > 0 && <rect x={LANE_X0} y={y - 10} width={x - LANE_X0} height={20} rx={10} fill={color} />}
      {front && reach > 0 && <circle cx={x} cy={y} r={22} fill={color} />}
    </g>
  );
}

export function RaceTrack() {
  const t = useTime();
  const base = useIn(0, 0.5);
  const lightGo = useSaid('race-light', '眨');
  const soundGo = useSaid('race-sound', '声');
  const lightReach = interpolate(t, [lightGo, lightGo + 0.12], [0, 1], {easing: Easing.outCubic, clamp: true});
  // sound at its true speed: 3 km in about 8.8 s, so it is only part way when the scene ends
  const soundSecs = interpolate(t, [soundGo, 9.4], [0, 9.4 - soundGo], {clamp: true});
  const soundReach = Math.min(1, (soundSecs * SOUND) / KM);
  const lightLabel = useIn(useSaid('race-light', '光'), 0.4);
  const soundLabel = useIn(soundGo, 0.4);
  return (
    <svg width="100%" height="100%" viewBox="0 0 1640 600" style={{opacity: base}}>
      {/* the strike, at the left */}
      <g transform="translate(70 40)"><path d={boltPath(500)} fill={C.light} opacity={0.9} /></g>
      <line x1={40} y1={560} x2={1600} y2={560} stroke={C.rule} strokeWidth={4} />
      {/* the house, at the right */}
      <g transform="translate(1500 450)">
        <path d="M0,45 L50,0 L100,45 L100,110 L0,110 Z" fill={C.panel} stroke={C.dim} strokeWidth={4} />
        <rect x={40} y={70} width={22} height={40} fill={C.dim} />
      </g>
      <Lane y={170} color={C.light} label="光" value="约 30 万" unit="公里/秒" reach={lightReach} front={false} named={lightLabel} />
      <Lane y={400} color={C.sound} label="声" value="约 340" unit="米/秒" reach={soundReach} front named={soundLabel} />
      <g opacity={soundLabel}>
        <text x={Math.round(LANE_X0 + (LANE_X1 - LANE_X0) * soundReach)} y={470} textAnchor="middle" fill={C.sound} style={{font: T.label.font}}>
          {soundSecs.toFixed(1)} 秒
        </text>
      </g>
      {/* the distance */}
      <text x={(LANE_X0 + LANE_X1) / 2} y={548} textAnchor="middle" fill={C.dim} style={{font: T.label.font}}>←  3 公里  →</text>
    </svg>
  );
}

/** The two arrival times, each labelled as the calculation it is. */
export function RaceTimes() {
  const light = useIn(useSaid('race-light', '到') + 0.1, 0.5);
  const sound = useIn(useSaid('race-sound', '慢'), 0.5);
  const row = {display: 'flex', alignItems: 'baseline', gap: 24};
  return (
    <div style={{display: 'flex', gap: 64, height: '100%', alignItems: 'center'}}>
      <div style={{...row, opacity: light}}>
        <span style={{...T.label, color: C.dim}}>按 3 公里算，到达要</span>
        <span style={{...T.body, color: C.light, fontWeight: 900}}>光 约 0.00001 秒</span>
      </div>
      <div style={{...row, opacity: sound}}>
        <span style={{...T.body, color: C.sound, fontWeight: 900}}>声 约 9 秒</span>
      </div>
    </div>
  );
}
