// Scene 4: count the seconds from the flash to the thunder, divide by 3, and that is about how many km away the storm is.
import {interpolate, Easing, useTime} from '@motionhub/runtime';
import {C, T, boltPath, useIn, useSaid} from './kit';

const SECONDS = 6;

/** A timeline: the flash at 0, a tick for each second counted, and the thunder landing on the last. */
export function CountLine() {
  const t = useTime();
  const base = useIn(0, 0.5);
  const flash = useSaid('count-start', '闪');
  const counting = useSaid('count-start', '数');
  const thunder = useSaid('count-start', '雷');
  const example = useSaid('count-example', '6');
  const x0 = 200;
  const step = 200;
  const ticks = Array.from({length: SECONDS}, (_, i) => i + 1);
  const flashIn = useIn(flash, 0.3);
  const boom = interpolate(t, [thunder, thunder + 0.4], [0, 1], {easing: Easing.outBack, clamp: true});
  const six = interpolate(t, [example, example + 0.4], [0, 1], {easing: Easing.outCubic, clamp: true});
  return (
    <svg width="100%" height="100%" viewBox="0 0 1640 300" style={{opacity: base}}>
      <line x1={x0} y1={170} x2={x0 + step * SECONDS} y2={170} stroke={C.rule} strokeWidth={6} strokeLinecap="round" />
      <g transform={`translate(${x0 - 22} 20)`} opacity={flashIn}><path d={boltPath(130)} fill={C.light} /></g>
      <text x={x0} y={250} textAnchor="middle" fill={C.light} style={{font: T.label.font}} opacity={flashIn}>看到闪电</text>
      {ticks.map((n, i) => {
        // the ticks come in one by one between "数秒" and "雷声": a diagram of the seconds, not a clock
        const at = counting + ((thunder - counting) * i) / SECONDS;
        const k = interpolate(t, [at, at + 0.3], [0, 1], {easing: Easing.outCubic, clamp: true});
        const x = x0 + step * n;
        const lit = n === SECONDS ? six : 0;
        return (
          <g key={n} opacity={k}>
            <circle cx={x} cy={170} r={Math.round(14 + 10 * lit)} fill={n === SECONDS ? C.sound : C.ink} />
            <text x={x} y={250} textAnchor="middle" fill={lit > 0 ? C.sound : C.ink} style={{font: T.label.font}}>{n} 秒</text>
          </g>
        );
      })}
      <g transform={`translate(${x0 + step * SECONDS} 80) scale(${Math.max(0.01, boom)})`} opacity={boom < 0.05 ? 0 : Math.min(1, boom)}>
        <text x={0} y={0} textAnchor="middle" fill={C.sound} style={{font: T.figure.font}}>轰！</text>
      </g>
    </svg>
  );
}

function Term({at, swapAt, from, to, color}: {at: number; swapAt?: number; from: string; to?: string; color: string}) {
  const t = useTime();
  const k = useIn(at, 0.4);
  const swap = swapAt === undefined ? 0 : interpolate(t, [swapAt, swapAt + 0.4], [0, 1], {easing: Easing.inOutCubic, clamp: true});
  return (
    <span style={{position: 'relative', display: 'inline-block', opacity: k, transform: `translateY(${Math.round((1 - k) * 20)}px)`}}>
      <span style={{color, opacity: 1 - swap}}>{from}</span>
      {to && (
        <span style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', color, opacity: swap, whiteSpace: 'nowrap'}}>{to}</span>
      )}
    </span>
  );
}

/** The rule, term by term as it is named; then the example's numbers take the terms' places. */
export function Rule() {
  // the panel arrives with the rule, so the timeline has the stage to itself while the seconds are counted
  const panel = useIn(useSaid('count-rule', '把'), 0.4);
  const seconds = useSaid('count-rule', '秒');
  const three = useSaid('count-rule', '3');
  const km = useSaid('count-rule', '公');
  const six = useSaid('count-example', '6');
  const two = useSaid('count-example', '2');
  return (
    <div style={{opacity: panel, height: '100%', borderRadius: 24, background: C.panel, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, ...T.head}}>
      <Term at={seconds} swapAt={six} from="秒数" to="6 秒" color={C.ink} />
      <Term at={three} from="÷ 3" color={C.ink} />
      <Term at={km} from="≈" color={C.dim} />
      <Term at={km} swapAt={two} from="公里数" to="2 公里" color={C.sound} />
    </div>
  );
}
