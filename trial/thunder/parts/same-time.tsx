// Scene 2: one strike makes both. The bolt heats the air in its channel, the air bursts outward, and that burst is the thunder.
import {interpolate, Easing, useTime} from '@motionhub/runtime';
import {C, T, Cloud, boltPath, useIn, useSaid} from './kit';

/** The strike: cloud and field from the start; the bolt lands as "闪电" is said, then its channel glows and the air bursts out in rings. */
export function Strike() {
  const t = useTime();
  const base = useIn(0, 0.5);
  const strike = useSaid('same-born', '闪');
  const hot = useSaid('same-why', '烧');
  const burst = useSaid('same-why', '膨');
  const bolt = interpolate(t, [strike, strike + 0.12], [0, 1], {easing: Easing.outCubic, clamp: true});
  const heat = interpolate(t, [hot, hot + 0.8], [0, 1], {easing: Easing.inOutCubic, clamp: true});
  const rings = [0, 1, 2, 3].map((i) =>
    interpolate(t, [burst + i * 0.35, burst + 1.6 + i * 0.35], [0, 1], {easing: Easing.outCubic, clamp: true}),
  );
  // the channel: the bolt seen from the side, x 470 to 520, y 210 to 760
  return (
    <svg width="100%" height="100%" viewBox="0 0 1000 820" style={{opacity: base}}>
      <defs>
        <radialGradient id="strike-heat" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.light} stopOpacity={0.5} />
          <stop offset="0.5" stopColor={C.sound} stopOpacity={0.2} />
          <stop offset="1" stopColor={C.sound} stopOpacity={0} />
        </radialGradient>
      </defs>
      <line x1={40} y1={760} x2={960} y2={760} stroke={C.rule} strokeWidth={4} />
      <ellipse cx={495} cy={480} rx={Math.round(60 + 140 * heat)} ry={300} fill="url(#strike-heat)" opacity={heat} />
      {rings.map((k, i) => {
        const r = Math.round(90 + k * 300);
        return (
          <ellipse key={i} cx={495} cy={480} rx={r} ry={Math.round(r * 0.75)} fill="none" stroke={C.sound} strokeWidth={8}
            opacity={k > 0 ? 0.85 * (1 - k) + 0.1 : 0} />
        );
      })}
      <g transform="translate(470 230)" opacity={bolt}>
        <path d={boltPath(530)} fill={C.light} />
      </g>
      <g transform="translate(215 70)"><Cloud w={560} lit={0.6 * bolt} /></g>
    </svg>
  );
}

function Fact({at, children}: {at: number; children: React.ReactNode}) {
  // each fact arrives, panel and all, with the words that name it
  const k = useIn(at, 0.5);
  return (
    <div style={{opacity: k, transform: `translateX(${Math.round((1 - k) * 40)}px)`, padding: '28px 36px', borderRadius: 20, background: C.panel}}>
      {children}
    </div>
  );
}

/** What to keep in view: born together; how hot; the burst is the sound. */
export function SameFacts() {
  const together = useSaid('same-born', '同');
  const hot = useSaid('same-why', '几');
  const burst = useSaid('same-why', '膨');
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 28, height: '100%', justifyContent: 'center'}}>
      <Fact at={together}>
        <div style={{...T.figure, color: C.ink}}>
          <span style={{color: C.light}}>光</span> + <span style={{color: C.sound}}>声</span>
        </div>
        <div style={{...T.label, color: C.dim, marginTop: 12}}>同一瞬间产生</div>
      </Fact>
      <Fact at={hot}>
        <div style={{...T.figure, color: C.light}}>几万 °C</div>
        <div style={{...T.label, color: C.dim, marginTop: 12}}>闪电通道里的空气</div>
      </Fact>
      <Fact at={burst}>
        <div style={{...T.figure, color: C.sound}}>膨胀 → 雷声</div>
        <div style={{...T.label, color: C.dim, marginTop: 12}}>空气猛地向外推开</div>
      </Fact>
    </div>
  );
}
