// The cover: the question as the headline, and the storm it is about, drawn whole at frame 0 (the thumbnail).
import {interpolate, Easing, useTime} from '@motionhub/runtime';
import {C, T, Cloud, boltPath, useSaid} from './kit';

export function CoverTitle() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: 24}}>
      <div style={{...T.hero, color: C.ink}}>
        先看到<span style={{color: C.light}}>闪电</span>，
      </div>
      <div style={{...T.hero, color: C.ink}}>
        后听到<span style={{color: C.sound}}>雷声</span>？
      </div>
    </div>
  );
}

/** A cloud, a bolt down to the field, a house at the far edge, and thunder's rings reaching it once "雷声" is said. */
export function CoverStorm() {
  const t = useTime();
  const thunder = useSaid('cover-ask', '雷');
  // The bolt is there from frame 0; it flickers once more as the question names lightning.
  const flash = useSaid('cover-ask', '闪');
  const flicker = 1 - 0.55 * Math.max(0, 1 - Math.abs(t - flash - 0.08) / 0.12);
  const rings = [0, 1, 2].map((i) => interpolate(t, [thunder + i * 0.18, thunder + 1.2 + i * 0.18], [0, 1], {easing: Easing.outCubic, clamp: true}));
  return (
    <svg width="100%" height="100%" viewBox="0 0 760 780">
      <defs>
        <radialGradient id="cover-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.light} stopOpacity={0.22} />
          <stop offset="1" stopColor={C.light} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={330} cy={430} r={320} fill="url(#cover-glow)" opacity={flicker} />
      <line x1={0} y1={700} x2={760} y2={700} stroke={C.rule} strokeWidth={4} />
      <g transform="translate(232 170)" opacity={flicker}>
        <path d={boltPath(530)} fill={C.light} />
      </g>
      <g transform="translate(20 60)"><Cloud w={560} lit={0.5} /></g>
      {/* the house that hears it, at the far end of the field */}
      <g transform="translate(610 610)">
        <path d="M0,40 L45,0 L90,40 L90,90 L0,90 Z" fill={C.panel} stroke={C.dim} strokeWidth={4} />
        <rect x={36} y={56} width={20} height={34} fill={C.dim} />
      </g>
      {rings.map((k, i) => {
        // a quarter circle about the strike point, growing out toward the house
        const r = Math.round(60 + k * 300);
        return (
          <path
            key={i}
            d={`M 245 ${700 - r} A ${r} ${r} 0 0 1 ${245 + r} 700`}
            fill="none"
            stroke={C.sound}
            strokeWidth={8}
            strokeLinecap="round"
            opacity={k > 0 ? 0.9 * (1 - 0.6 * k) : 0}
          />
        );
      })}
    </svg>
  );
}
