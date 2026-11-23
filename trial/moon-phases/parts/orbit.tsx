// The orbit, seen from above the North Pole: sunlight from the left, Earth in the middle, the Moon going round it
// anticlockwise with its sunward half always lit, and a lens showing the Moon as we see it from Earth.
// One picture carried through three scenes (orbit, myth, ending): each passes on where the Moon is.
import {Easing, interpolate, useTime} from '@motionhub/runtime';
import {Lens} from '../motions/@iamsuosi/night-diagram/react/parts/lens.tsx';
import {Pin} from '../motions/@iamsuosi/night-diagram/react/parts/pin.tsx';
import {C, CANVAS} from '../motions/@iamsuosi/night-diagram/react/parts/night.ts';
import {HalfLit, MOON_DARK, MOON_LIT, PhaseDisc, Sun} from './bodies.tsx';
import {Reading} from './reading.tsx';

const E = {x: 700, y: 540, r: 72};
const R = 270;
const MOON_R = 40;
const LENS = {x: 1540, y: 470, r: 210};

/** Where the Moon is: its angle on the screen around Earth, in degrees; 180 is new (towards the Sun), decreasing as it goes. */
const moonAt = (a: number): [number, number] => [E.x + R * Math.cos((a * Math.PI) / 180), E.y + R * Math.sin((a * Math.PI) / 180)];
/** The elongation the lens shows for that angle: 0 new, 90 first quarter, 180 full, 270 last quarter. */
const phaseOf = (a: number) => (((180 - a) % 360) + 360) % 360;
const NAMES: Array<[number, string]> = [[0, '新月'], [90, '上弦'], [180, '满月'], [270, '下弦'], [360, '新月']];
const nameOf = (p: number) => NAMES.find(([at]) => Math.abs(p - at) < 6)?.[1];

/** Moves a value through [second, value] keys, each leg eased. */
function keys(t: number, k: Array<[number, number]>) {
  let v = k[0]![1];
  for (let i = 1; i < k.length; i++) if (t >= k[i - 1]![0]) v = interpolate(t, [k[i - 1]![0], k[i]![0]], [k[i - 1]![1], k[i]![1]], {easing: Easing.inOutCubic, clamp: true});
  return v;
}

function Diagram({angle, orbit = 1, shadow = 0, eclipse = 0, lens = 0, lensLabel, enter = 1}: {angle: number; orbit?: number; shadow?: number; eclipse?: number; lens?: number; lensLabel?: string; enter?: number}) {
  const [mx, my] = moonAt(angle);
  const phase = phaseOf(angle);
  const name = nameOf(phase);
  const label = lensLabel ?? (name ? `从地球上看 · ${name}` : '从地球上看');
  const circ = 2 * Math.PI * R;
  // Earth's shadow: from Earth's rim, away from the Sun, narrowing slowly (the umbra), past the Moon's orbit
  const reach = E.x + 470 * shadow;
  const narrow = (x: number) => E.r * (1 - ((x - E.x) / 470) * 0.55);
  return (
    <>
      <Sun x={-170} y={E.y} r={200} />
      <svg {...CANVAS} style={{...CANVAS.style, opacity: enter}}>
        <defs>
          <filter id="orbit-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={6} /></filter>
        </defs>
        {/* sunlight, all the way across: faint parallel rays */}
        {[-240, -160, -80, 0, 80, 160, 240].map((dy) => (
          <path key={dy} d={`M90 ${E.y + dy}H1180`} stroke={C.ember} strokeWidth={2} opacity={0.18} />
        ))}
        {shadow > 0 && (
          <path d={`M${E.x} ${E.y - E.r}L${reach} ${Math.round(E.y - narrow(reach))}V${Math.round(E.y + narrow(reach))}L${E.x} ${E.y + E.r}Z`} fill="#01030C" opacity={0.82} filter="url(#orbit-soft)" />
        )}
        <circle cx={E.x} cy={E.y} r={R} fill="none" stroke={C.line} strokeWidth={2.5} strokeDasharray={`${circ * orbit} ${circ}`} transform={`rotate(180 ${E.x} ${E.y})`} />
        <HalfLit x={E.x} y={E.y} r={E.r} lit="#8CCFEA" dark="#173064" />
        <HalfLit x={mx} y={my} r={MOON_R} lit={MOON_LIT} dark={MOON_DARK} eclipse={eclipse} />
        <text x={E.x} y={E.y + E.r + 44} textAnchor="middle" fontFamily="var(--font-sans)" fontSize={32} fontWeight={600} fill={C.ice}>地球</text>
        <text x={110} y={E.y - 268} fontFamily="var(--font-sans)" fontSize={32} fontWeight={600} fill={C.ember}>阳光 →</text>
      </svg>
      <Lens at={[LENS.x, LENS.y]} r={LENS.r} from={[Math.round(mx), Math.round(my)]} show={lens} label={label}>
        <PhaseDisc r={150} phase={phase} eclipse={eclipse} />
      </Lens>
    </>
  );
}

const ease = {easing: Easing.inOutCubic, clamp: true} as const;

/** Scene "orbit": a lap with its length, then new, first quarter, full and last quarter in turn. */
export function OrbitScene() {
  const t = useTime();
  const angle = keys(t, [[0, 180], [0.7, 180], [3.0, -180], [7.2, -180], [8.6, -270], [10.4, -270], [11.8, -360], [13.4, -360], [14.8, -450]]);
  const enter = interpolate(t, [0, 0.5], [0, 1], ease);
  return (
    <>
      <Diagram angle={angle} enter={enter} orbit={interpolate(t, [0.3, 1.6], [0, 1], ease)} lens={interpolate(t, [3.8, 4.7], [0, 1], ease)} />
      <Reading at={[1300, 300]} label="绕地球一圈（新月到新月）" value={29.5} decimals={1} unit="天" source="NASA Science · Moon Phases" color={C.ink}
        show={Math.min(interpolate(t, [0.6, 1.2], [0, 1], ease), interpolate(t, [3.1, 3.6], [1, 0], ease))} roll={interpolate(t, [0.9, 2.6], [0, 1], ease)} />
    </>
  );
}

/** Scene "myth": Earth's shadow points away from the Sun; a crescent is nowhere near it, a full Moon can fall in it. */
export function MythScene() {
  const t = useTime();
  const angle = keys(t, [[0, -450], [0.3, -450], [1.3, -495], [4.0, -495], [6.0, -720]]);
  const shadow = interpolate(t, [0.9, 1.9], [0, 1], ease);
  const eclipse = interpolate(t, [6.0, 7.0], [0, 1], ease);
  const eclipsed = eclipse > 0.5;
  return (
    <>
      <Diagram angle={angle} lens={1} shadow={shadow} eclipse={eclipse} lensLabel={eclipsed ? '从地球上看 · 月食' : undefined} />
      <Pin at={[1060, 540]} elbow={[1100, 770]} to={1300} text="地球的影子" note="背着太阳" color={C.read} t={interpolate(t, [2.0, 2.8], [0, 1], {easing: Easing.linear, clamp: true})} />
      <Pin at={[970, 520]} elbow={[1010, 300]} to={1240} text="月食" note="日、地、月排成一线时" color={C.ember} t={interpolate(t, [6.6, 7.4], [0, 1], {easing: Easing.linear, clamp: true})} />
    </>
  );
}

/** Scene "ending": the shadow goes, and the Moon goes on round; the lens runs through its phases. */
export function EndingScene() {
  const t = useTime();
  const angle = keys(t, [[0, -720], [0.6, -720], [3.4, -952]]);
  return <Diagram angle={angle} lens={1} shadow={interpolate(t, [0, 0.6], [1, 0], ease)} eclipse={interpolate(t, [0, 0.6], [1, 0], ease)} />;
}
