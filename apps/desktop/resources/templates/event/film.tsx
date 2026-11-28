import { Film, Scene, Layer, Line, Sound, useTime, useCompositionTime, interpolate, Easing } from '@motionhub/runtime';
import inter from './media/Inter.woff2';

export const film = { width: 1920, height: 1080, fps: 30 };

/**
 * The event. Everything here is a sample to replace: the event, its date, its place, its programme and its speakers
 * are made up, and example.com is a placeholder address. The programme takes any number of items up to six, and the
 * speakers any number up to six; their cards show initials, or a picture when `photo` is one imported from media/
 * (`import ada from './media/ada.jpg'`, then `photo: ada`). Change it, and run `oms sound` again for the effects,
 * which are timed to four items and three speakers.
 */
const EVENT = {
  name: 'Motion Night',
  line: 'An evening of short films made with agents.',
  weekday: 'Thursday',
  day: 18,
  month: 'March',
  year: 2027,
  time: '19:00 – 21:00',
  place: 'Riverside Hall',
  room: 'Studio 4 · doors open 18:45',
  programme: [
    { at: '19:00', what: 'Drinks and hellos' },
    { at: '19:20', what: 'Ten short films, two minutes each' },
    { at: '20:10', what: 'Talk: directing an agent' },
    { at: '20:40', what: 'Your questions' },
  ],
  speakers: [
    { name: 'Ada Park', role: 'Animator' },
    { name: 'Leo Ruiz', role: 'Sound designer' },
    { name: 'Mei Tan', role: 'Developer' },
  ] as { name: string; role: string; photo?: string }[],
  register: 'Free · register at example.com/motion-night',
};

// The look: a gig poster. Ground #1D1B4B, ink #F6F3EA, one accent #FF7A59 for the date and the call; cards #2B2966;
// Inter. Film frames drift along the foot of the poster, the event's motif.
const C = { ground: '#1D1B4B', ink: '#F6F3EA', accent: '#FF7A59', card: '#2B2966', dim: '#A9A6C9', deep: '#15133A' };
const face = `@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 100 900; font-display: block; }`;
const type = { fontFamily: "'Inter', sans-serif", margin: 0, lineHeight: 1.1 } as const;
const DATE = `${EVENT.weekday} ${EVENT.day} ${EVENT.month} ${EVENT.year}`;
/** When each scene starts, in seconds into the film. */
const AT = { poster: 0, when: 3.2, where: 6, programme: 8.8, speakers: 12.6, register: 15.6, end: 20 };

const ease = (t: number, from: number, to: number, a = 0, b = 1, easing = Easing.outCubic) =>
  interpolate(t, [from, to], [a, b], { easing, clamp: true });
/** Rises into place from `at`, over half a second. */
const rise = (t: number, at: number, by = 36) => {
  const k = ease(t, at, at + 0.5);
  return { opacity: k, transform: `translateY(${Math.round((1 - k) * by)}px)` };
};
const initials = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

function Ground() {
  return (
    <div style={{ width: '100%', height: '100%', background: C.ground }}>
      <style>{face}</style>
    </div>
  );
}

/** Film frames drifting along the foot of the frame, across the whole film. */
function Strip() {
  const t = useCompositionTime();
  const offset = (t * 40) % 260;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: C.deep }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', top: 22, left: Math.round(i * 260 - offset), width: 220, height: 76, borderRadius: 10, background: i % 3 === 1 ? C.accent : C.card, opacity: i % 3 === 1 ? 0.55 : 1 }} />
      ))}
    </div>
  );
}

/** The cover: the name, its line and its date, all there from the first frame. */
function Poster() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: C.ink }}>
      <p style={{ ...type, fontSize: 48, fontWeight: 700, color: C.accent, marginBottom: 32 }}>{DATE}</p>
      <h1 style={{ ...type, fontSize: 250, fontWeight: 800, letterSpacing: -10 }}>{EVENT.name}</h1>
      <p style={{ ...type, fontSize: 56, color: C.dim, marginTop: 44 }}>{EVENT.line}</p>
    </div>
  );
}

/** When: a calendar leaf turned down onto the day, the time beside it. */
function When() {
  const t = useTime();
  const turn = ease(t, 0.1, 0.7, 0, 1, Easing.outBack);
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 110, color: C.ink }}>
      <div style={{ width: 460, borderRadius: 36, overflow: 'hidden', background: C.ink, color: C.ground, transformOrigin: '50% 0', transform: `perspective(1600px) rotateX(${Math.round((1 - turn) * -90)}deg)`, opacity: turn > 0 ? 1 : 0 }}>
        <div style={{ background: C.accent, color: C.ink, padding: '26px 0', textAlign: 'center' }}>
          <span style={{ ...type, fontSize: 56, fontWeight: 800, letterSpacing: 6 }}>{EVENT.month.slice(0, 3).toUpperCase()}</span>
        </div>
        <p style={{ ...type, fontSize: 300, fontWeight: 800, letterSpacing: -12, textAlign: 'center', padding: '24px 0 40px' }}>{EVENT.day}</p>
      </div>
      <div>
        <p style={{ ...type, fontSize: 48, fontWeight: 600, color: C.accent, ...rise(t, 0.5) }}>When</p>
        <p style={{ ...type, fontSize: 120, fontWeight: 800, letterSpacing: -4, marginTop: 20, ...rise(t, 0.6) }}>{EVENT.weekday}</p>
        <p style={{ ...type, fontSize: 72, fontWeight: 600, marginTop: 20, ...rise(t, 0.75) }}>{EVENT.time}</p>
      </div>
    </div>
  );
}

/** Where: a pin dropped onto its spot (its point at 230, 380 of the box), ripples going out, the place beside it. */
function Where() {
  const t = useTime();
  const drop = ease(t, 0.1, 0.6, 0, 1, Easing.outBack);
  const ripple = (t - 0.6) % 1.2;
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 110, color: C.ink }}>
      <div style={{ position: 'relative', width: 460, height: 460, display: 'grid', placeItems: 'center' }}>
        {t > 0.6 && [0, 0.6].map((d) => {
          const k = (((ripple - d) % 1.2) + 1.2) % 1.2 / 1.2;
          return <div key={d} style={{ position: 'absolute', left: 230 - 200 * k, top: 380 - 60 * k, width: 400 * k, height: 120 * k, borderRadius: '50%', border: `6px solid ${C.accent}`, opacity: 1 - k }} />;
        })}
        <div style={{ position: 'absolute', left: 150, top: Math.round(232 - 300 * (1 - drop)), width: 160, height: 160, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: C.accent, opacity: drop > 0 ? 1 : 0 }}>
          <div style={{ position: 'absolute', left: 50, top: 50, width: 60, height: 60, borderRadius: 30, background: C.ground }} />
        </div>
      </div>
      <div>
        <p style={{ ...type, fontSize: 48, fontWeight: 600, color: C.accent, ...rise(t, 0.4) }}>Where</p>
        <p style={{ ...type, fontSize: 120, fontWeight: 800, letterSpacing: -4, marginTop: 20, ...rise(t, 0.5) }}>{EVENT.place}</p>
        <p style={{ ...type, fontSize: 60, color: C.dim, marginTop: 24, ...rise(t, 0.65) }}>{EVENT.room}</p>
      </div>
    </div>
  );
}

/** The programme: a line drawn down the evening, each item arriving where the line reaches it. */
function Programme() {
  const t = useTime();
  const step = 0.55;
  const line = ease(t, 0.3, 0.3 + step * EVENT.programme.length, 0, 1, Easing.inOutSine);
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: C.ink }}>
      <p style={{ ...type, fontSize: 56, fontWeight: 700, marginBottom: 48, ...rise(t, 0) }}>The evening</p>
      <div style={{ position: 'relative', paddingLeft: 80 }}>
        <div style={{ position: 'absolute', left: 22, top: 20, bottom: 20, width: 6, borderRadius: 3, background: C.card }} />
        <div style={{ position: 'absolute', left: 22, top: 20, width: 6, borderRadius: 3, background: C.accent, height: `calc((100% - 40px) * ${line})` }} />
        {EVENT.programme.map((item, i) => {
          const arrive = 0.4 + i * step;
          return (
            <div key={item.at} style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 48, padding: '22px 0', ...rise(t, arrive, 20) }}>
              <div style={{ position: 'absolute', left: -70, top: 38, width: 26, height: 26, borderRadius: 13, background: C.accent }} />
              <span style={{ ...type, fontSize: 64, fontWeight: 800, color: C.accent, width: 220, fontVariantNumeric: 'tabular-nums' }}>{item.at}</span>
              <span style={{ ...type, fontSize: 64, fontWeight: 600 }}>{item.what}</span>
            </div>
          );
        })}
      </div>
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
          <div key={speaker.name} style={{ background: C.card, borderRadius: 32, padding: '52px 44px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 36, ...rise(t, 0.3 + i * 0.3, 60) }}>
            <div style={{ width: 160, height: 160, borderRadius: 80, background: C.accent, color: C.ground, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
              {speaker.photo ? <img src={speaker.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...type, fontSize: 64, fontWeight: 800 }}>{initials(speaker.name)}</span>}
            </div>
            <div>
              <p style={{ ...type, fontSize: 60, fontWeight: 700 }}>{speaker.name}</p>
              <p style={{ ...type, fontSize: 44, color: C.dim, marginTop: 14 }}>{speaker.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The call: the name again, how to come, and everything else in one line under it. */
function Register() {
  const t = useTime();
  const pulse = t > 1.2 ? 1 + 0.03 * Math.sin((t - 1.2) * Math.PI * 2) : 1;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', gap: 56, color: C.ink }}>
      <h1 style={{ ...type, fontSize: 170, fontWeight: 800, letterSpacing: -6, ...rise(t, 0) }}>See you there.</h1>
      <div style={{ ...rise(t, 0.35) }}>
        <p style={{ ...type, fontSize: 60, fontWeight: 700, background: C.accent, color: C.ground, padding: '30px 48px', borderRadius: 999, transform: `scale(${pulse})`, transformOrigin: 'left center' }}>{EVENT.register}</p>
      </div>
      <p style={{ ...type, fontSize: 44, color: C.dim, ...rise(t, 0.6) }}>
        {EVENT.name} · {DATE} · {EVENT.time} · {EVENT.place}
      </p>
    </div>
  );
}

const FRAME = { x: 160, y: 90, w: 1600, h: 800 };
const and = (names: string[]) => names.join(', ').replace(/, ([^,]*)$/, ' and $1');

export default function Main() {
  return (
    <Film>
      <Sound src="media/bed.mp3" volume={-4} fadeOut={1.5} />
      <Sound src="media/effects.mp3" volume={-3} />
      <Layer id="ground">
        <Ground />
      </Layer>
      <Layer id="film-strip" x={0} y={960} w={1920} h={120}>
        <Strip />
      </Layer>
      <Scene id="poster" duration={AT.when - AT.poster}>
        <Line id="poster-line">{`${EVENT.name}: ${EVENT.line}`}</Line>
        <Layer id="poster-title" {...FRAME}>
          <Poster />
        </Layer>
      </Scene>
      <Scene id="when" duration={AT.where - AT.when}>
        <Line id="when-line">{`${DATE}, ${EVENT.time}.`}</Line>
        <Layer id="calendar" {...FRAME}>
          <When />
        </Layer>
      </Scene>
      <Scene id="where" duration={AT.programme - AT.where}>
        <Line id="where-line">{`At ${EVENT.place}, ${EVENT.room}.`}</Line>
        <Layer id="place" {...FRAME}>
          <Where />
        </Layer>
      </Scene>
      <Scene id="programme" duration={AT.speakers - AT.programme}>
        <Line id="programme-line">{EVENT.programme.map((item) => `${item.at} ${item.what}`).join('. ')}.</Line>
        <Layer id="programme-list" {...FRAME}>
          <Programme />
        </Layer>
      </Scene>
      <Scene id="speakers" duration={AT.register - AT.speakers}>
        <Line id="speakers-line">{`With ${and(EVENT.speakers.map((s) => s.name))}.`}</Line>
        <Layer id="speaker-cards" {...FRAME}>
          <Speakers />
        </Layer>
      </Scene>
      <Scene id="register" duration={AT.end - AT.register}>
        <Line id="register-line">{EVENT.register}</Line>
        <Layer id="register-call" {...FRAME}>
          <Register />
        </Layer>
      </Scene>
    </Film>
  );
}
