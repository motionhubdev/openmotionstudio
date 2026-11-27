import { Film, Scene, Layer, Line, Sound, useTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

/**
 * The event. Everything here is a sample to replace: the event, its date, its place and its speakers are made up, and
 * example.com is a placeholder address. The speakers lay themselves out for any number from one to six; their cards
 * show initials, or a picture when `photo` is one imported from media/ (`import ada from './media/ada.jpg'`, then
 * `photo: ada`). Change it, and run `oms sound` again for the effects, which are timed to three speakers.
 */
const EVENT = {
  name: 'Motion Night',
  line: 'An evening of short films made with agents.',
  date: 'Thursday 18 March 2027',
  time: '19:00 – 21:00',
  place: 'Riverside Hall, Studio 4',
  speakers: [
    { name: 'Ada Park', role: 'Animator' },
    { name: 'Leo Ruiz', role: 'Sound designer' },
    { name: 'Mei Tan', role: 'Developer' },
  ] as { name: string; role: string; photo?: string }[],
  register: 'Free · register at example.com/motion-night',
};

// The look: a gig poster. Ground #1D1B4B, ink #F6F3EA, one accent #FF7A59 for the date and the call; the speakers'
// cards in #2B2966; Inter.
const C = { ground: '#1D1B4B', ink: '#F6F3EA', accent: '#FF7A59', card: '#2B2966', dim: '#A9A6C9' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1 } as const;

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });
/** Rises into place from `at`, over half a second. */
const rise = (t: number, at: number) => {
  const k = ease(t, at, at + 0.5);
  return { opacity: k, transform: `translateY(${Math.round((1 - k) * 36)}px)` };
};
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

/** The cover: the event's name, its line and its date, all there at the first frame. */
function Poster() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: C.ink }}>
      <p style={{ ...type, fontSize: 48, fontWeight: 700, color: C.accent, marginBottom: 32 }}>{EVENT.date}</p>
      <h1 style={{ ...type, fontSize: 230, fontWeight: 800, letterSpacing: -9 }}>{EVENT.name}</h1>
      <p style={{ ...type, fontSize: 56, color: C.dim, marginTop: 40 }}>{EVENT.line}</p>
    </div>
  );
}

/** When and where, one row each. */
function Details() {
  const t = useTime();
  const rows = [
    { label: 'When', value: EVENT.date, more: EVENT.time },
    { label: 'Where', value: EVENT.place },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 72, color: C.ink }}>
      {rows.map((row, i) => (
        <div key={row.label} style={{ display: 'flex', alignItems: 'baseline', gap: 48, ...rise(t, 0.1 + i * 0.4) }}>
          <span style={{ ...type, fontSize: 48, fontWeight: 600, color: C.accent, width: 220 }}>{row.label}</span>
          <div>
            <p style={{ ...type, fontSize: 104, fontWeight: 800, letterSpacing: -3 }}>{row.value}</p>
            {row.more && <p style={{ ...type, fontSize: 56, color: C.dim, marginTop: 16 }}>{row.more}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The speakers as cards, as many as there are, in at most three columns. */
function Speakers() {
  const t = useTime();
  const columns = Math.min(3, EVENT.speakers.length);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 56, color: C.ink }}>
      <p style={{ ...type, fontSize: 56, fontWeight: 700, ...rise(t, 0) }}>{EVENT.speakers.length === 1 ? 'Speaker' : 'Speakers'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 40 }}>
        {EVENT.speakers.map((speaker, i) => (
          <div key={speaker.name} style={{ background: C.card, borderRadius: 28, padding: 44, display: 'flex', alignItems: 'center', gap: 36, ...rise(t, 0.3 + i * 0.3) }}>
            <div style={{ width: 128, height: 128, borderRadius: 64, background: C.accent, color: C.ground, display: 'grid', placeItems: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {speaker.photo ? <img src={speaker.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...type, fontSize: 52, fontWeight: 800 }}>{initials(speaker.name)}</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ ...type, fontSize: 52, fontWeight: 700 }}>{speaker.name}</p>
              <p style={{ ...type, fontSize: 40, color: C.dim, marginTop: 12 }}>{speaker.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The call: the event's name again, and how to come. */
function Register() {
  const t = useTime();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 56, color: C.ink }}>
      <h1 style={{ ...type, fontSize: 150, fontWeight: 800, letterSpacing: -5, ...rise(t, 0) }}>See you there.</h1>
      <p style={{ ...type, fontSize: 56, fontWeight: 700, background: C.accent, color: C.ground, padding: '28px 44px', borderRadius: 999, ...rise(t, 0.35) }}>{EVENT.register}</p>
      <p style={{ ...type, fontSize: 44, color: C.dim, ...rise(t, 0.6) }}>
        {EVENT.date} · {EVENT.time} · {EVENT.place}
      </p>
    </div>
  );
}

const FRAME = { x: 160, y: 120, w: 1600, h: 840 };

export default function Main() {
  return (
    <Film>
      <Sound src="media/effects.mp3" />
      <Layer id="ground">
        <Ground />
      </Layer>
      <Scene id="poster" duration={2.6}>
        <Line id="poster-line">{`${EVENT.name}: ${EVENT.line}`}</Line>
        <Layer id="poster-title" {...FRAME}>
          <Poster />
        </Layer>
      </Scene>
      <Scene id="details" duration={2.4}>
        <Line id="details-line">{`${EVENT.date}, ${EVENT.time}, at ${EVENT.place}.`}</Line>
        <Layer id="details-rows" {...FRAME}>
          <Details />
        </Layer>
      </Scene>
      <Scene id="speakers" duration={2.8}>
        <Line id="speakers-line">{`With ${EVENT.speakers.map((s) => s.name).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`}</Line>
        <Layer id="speaker-cards" {...FRAME}>
          <Speakers />
        </Layer>
      </Scene>
      <Scene id="register" duration={2.2}>
        <Line id="register-line">{EVENT.register}</Line>
        <Layer id="register-call" {...FRAME}>
          <Register />
        </Layer>
      </Scene>
    </Film>
  );
}
