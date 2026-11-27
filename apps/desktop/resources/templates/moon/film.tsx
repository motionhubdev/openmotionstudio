import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { Film, Scene, Layer, Line, Sound, useCompositionTime, useTime, interpolate, Easing, seededRandom } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

// The look: a planetarium at night. Sky #07090F, the Moon's grey lit by one white Sun, ink #E8ECF4, sunlight #FFD27A
// for the Sun's side of the diagram; Inter. The Moon is real 3D (three.js): a sphere lit from one side, seen from Earth
// as it goes once round, so its phase is the light, not a drawing of it.
const C = { sky: '#07090F', ink: '#E8ECF4', dim: '#6E7790', sun: '#FFD27A', orbit: '#2A3145' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1 } as const;

/**
 * The film's length, and the Moon's angle round Earth at a time (0 is new, on the Sun's side): once round across the
 * film, from first quarter, half lit, back to it.
 */
const SECONDS = 10;
const orbit = (t: number) => Math.PI / 2 + interpolate(t, [0.6, SECONDS - 0.8], [0, Math.PI * 2], { easing: Easing.inOutSine, clamp: true });

/** The phase's name at an angle round the orbit, as the lit part seen from Earth grows and shrinks. */
const PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
const phaseAt = (angle: number) => PHASES[Math.round(angle / (Math.PI / 4)) % 8]!;
/** How much of the face we see is lit, 0 to 1. */
const litShare = (angle: number) => (1 - Math.cos(angle)) / 2;

/** A grey, cratered surface, drawn once into a texture from a seeded random. */
function moonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#9A9A98';
  g.fillRect(0, 0, 1024, 512);
  const random = seededRandom(11);
  // The dark plains (maria), then craters of every size.
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(70, 70, 72, ${0.25 + random() * 0.25})`;
    g.beginPath();
    g.ellipse(random() * 1024, 120 + random() * 260, 40 + random() * 110, 30 + random() * 70, random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 420; i++) {
    const x = random() * 1024;
    const y = random() * 512;
    const r = 1 + random() ** 3 * 22;
    g.fillStyle = `rgba(60, 60, 62, ${0.15 + random() * 0.3})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `rgba(210, 210, 205, ${0.12 + random() * 0.2})`;
    g.lineWidth = Math.max(1, r / 5);
    g.beginPath();
    g.arc(x - r * 0.15, y - r * 0.15, r, Math.PI * 0.8, Math.PI * 1.9);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The Moon as Earth sees it. The Sun's light comes from +x; the Moon goes round Earth, at the origin, in the x-z plane;
 * the camera stays on Earth, looking at it. One renderer for the layer, drawn once a frame from the film's time, and
 * its context let go when the layer goes.
 */
function Moon() {
  const t = useCompositionTime();
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; moon: THREE.Mesh } | null>(null);
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current!, antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(900, 900, false);
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(100, 0, 0);
    scene.add(sun, new THREE.AmbientLight(0x8090b0, 0.04));
    const texture = moonTexture();
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }));
    scene.add(moon);
    const camera = new THREE.PerspectiveCamera(5.2, 1, 1, 100);
    world.current = { renderer, scene, camera, moon };
    return () => {
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      world.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    const w = world.current;
    if (!w) return;
    const angle = orbit(t);
    // Counter-clockwise seen from above Earth's north (+y): new Moon on the Sun's side, full Moon opposite it.
    w.moon.position.set(Math.cos(angle) * 30, 0, -Math.sin(angle) * 30);
    // The same face always towards Earth, the texture's seam on the far side.
    w.moon.rotation.y = angle + Math.PI;
    w.camera.position.set(0, 0, 0);
    w.camera.up.set(0, 1, 0);
    w.camera.lookAt(w.moon.position);
    w.renderer.render(w.scene, w.camera);
  }, [t]);
  return <canvas ref={canvas} width={900} height={900} style={{ width: 900, height: 900 }} />;
}

/** The orbit from above, the Sun's light from the right, the Moon where it is now, its far half dark. */
function Plan() {
  const t = useCompositionTime();
  const angle = orbit(t);
  const r = 150;
  const x = 220 + Math.cos(angle) * r;
  const y = 210 - Math.sin(angle) * r;
  return (
    <svg width={520} height={420} viewBox="0 0 520 420">
      {[60, 130, 200, 270, 340].map((ry) => (
        <line key={ry} x1={510} y1={ry} x2={430} y2={ry} stroke={C.sun} strokeWidth={3} opacity={0.6} />
      ))}
      <text x={510} y={30} textAnchor="end" fill={C.sun} style={{ ...type, fontSize: 24, fontWeight: 600 }}>
        Sunlight
      </text>
      <circle cx={220} cy={210} r={r} fill="none" stroke={C.orbit} strokeWidth={3} strokeDasharray="6 10" />
      <circle cx={220} cy={210} r={26} fill="#3D7BD9" />
      <text x={220} y={276} textAnchor="middle" fill={C.dim} style={{ ...type, fontSize: 24 }}>
        Earth
      </text>
      <g transform={`translate(${Math.round(x)} ${Math.round(y)})`}>
        <circle r={18} fill="#2B2F3A" />
        <path d="M 0 -18 A 18 18 0 0 1 0 18 Z" fill={C.ink} />
      </g>
    </svg>
  );
}

/** The phase's name and how much of the face is lit, as the Moon goes round. */
function Readout() {
  const t = useCompositionTime();
  const angle = orbit(t);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', color: C.ink }}>
      <p style={{ ...type, fontSize: 40, color: C.dim, marginBottom: 16, fontVariantNumeric: 'tabular-nums' }}>{Math.round(litShare(angle) * 100)}% lit</p>
      <h2 style={{ ...type, fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>{phaseAt(angle)}</h2>
    </div>
  );
}

/** Each scene's statement, in at the top left. */
function Heading({ text, still = false }: { text: string; still?: boolean }) {
  const t = useTime();
  const rise = still ? 1 : interpolate(t, [0, 0.5], [0, 1], { easing: Easing.outCubic, clamp: true });
  return (
    <h1 style={{ ...type, fontSize: 60, fontWeight: 700, letterSpacing: -1.5, color: C.ink, opacity: rise, transform: `translateY(${Math.round((1 - rise) * 20)}px)` }}>
      {text}
    </h1>
  );
}

/** A few stars, fixed, so the sky is not a void. */
const STARS = Array.from({ length: 90 }, (_, i) => {
  const random = seededRandom(100 + i);
  return { x: Math.round(random() * 1920), y: Math.round(random() * 1080), r: random() < 0.85 ? 1.5 : 2.5, o: 0.25 + random() * 0.5 };
});
function Sky() {
  return (
    <svg width={1920} height={1080} style={{ display: 'block', background: C.sky }}>
      <style>{face}</style>
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={C.ink} opacity={s.o} />
      ))}
    </svg>
  );
}

export default function Main() {
  return (
    <Film>
      <Sound src="media/orbit.mp3" />
      <Layer id="sky">
        <Sky />
      </Layer>
      <Layer id="moon" x={940} y={90} w={900} h={900}>
        <Moon />
      </Layer>
      <Layer id="orbit-plan" x={130} y={300} w={520} h={420}>
        <Plan />
      </Layer>
      <Layer id="phase" x={130} y={760} w={760} h={200}>
        <Readout />
      </Layer>
      <Scene id="half-lit" duration={2.6}>
        <Line id="half-lit-line">Half the Moon is always lit by the Sun.</Line>
        <Layer id="half-lit-heading" x={130} y={110} w={800} h={160}>
          <Heading text="Half the Moon is always lit." still />
        </Layer>
      </Scene>
      <Scene id="waxing" duration={2.6}>
        <Line id="waxing-line">As it goes round Earth, we see more of the lit half, until it is full.</Line>
        <Layer id="waxing-heading" x={130} y={110} w={800} h={160}>
          <Heading text="We see more of it…" />
        </Layer>
      </Scene>
      <Scene id="waning" duration={2.4}>
        <Line id="waning-line">Then less again, to new, when the lit half faces away.</Line>
        <Layer id="waning-heading" x={130} y={110} w={800} h={160}>
          <Heading text="…then less again." />
        </Layer>
      </Scene>
      <Scene id="month" duration={2.4}>
        <Line id="month-line">Once round every 29.5 days.</Line>
        <Layer id="month-heading" x={130} y={110} w={800} h={160}>
          <Heading text="Every 29.5 days." />
        </Layer>
      </Scene>
    </Film>
  );
}
