// A film the compositor is slow to draw: forty large blurred circles blended over one another under a frosted panel,
// all moving each frame. Each frame shows its own number in binary twice, in the panel and below it (40 px cells,
// white for one, lowest bit on the left), for scripts/test-frames.mjs to read back from the export.
import {Film, Layer, Scene, useTime} from '@motionhub/runtime';

export const film = {width: 1920, height: 1080, fps: 30};

/** Where the two numbers are drawn, in the frame's pixels: the panel's and the one below it. */
const CODES = [{x: 400, y: 280}, {x: 40, y: 1000}];

function Code({n, x, y}: {n: number; x: number; y: number}) {
  return (
    <div style={{position: 'absolute', left: x, top: y, display: 'flex'}}>
      {Array.from({length: 10}, (_, bit) => (
        <div key={bit} style={{width: 40, height: 40, background: (n >> bit) & 1 ? '#fff' : '#000'}} />
      ))}
    </div>
  );
}

function Frosted() {
  const t = useTime();
  const n = Math.round(t * film.fps);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#102', overflow: 'hidden'}}>
      {Array.from({length: 40}, (_, i) => {
        const size = 200 + ((i * 97) % 300);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: '50%',
              left: ((i * 241 + t * 120 * (1 + (i % 5))) % 2100) - 200,
              top: ((i * 173 + t * 80 * (1 + (i % 3))) % 1300) - 200,
              background: `hsl(${(i * 37 + t * 40) % 360} 90% 60%)`,
              filter: 'blur(40px)',
              mixBlendMode: 'screen',
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 360,
          top: 240,
          width: 1200,
          height: 600,
          borderRadius: 40,
          backdropFilter: 'blur(30px) saturate(1.4)',
          background: 'rgba(255,255,255,0.12)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: 120,
        }}
      >
        {`Frosted ${t.toFixed(1)}`}
      </div>
      {CODES.map((at, i) => <Code key={i} n={n} {...at} />)}
    </div>
  );
}

export default function Main() {
  return (
    <Film>
      <Scene id="frosted" duration={2}>
        <Layer id="frosted">
          <Frosted />
        </Layer>
      </Scene>
    </Film>
  );
}
