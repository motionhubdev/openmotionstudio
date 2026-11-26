// The website's hero film: OpenMotionStudio in six steps, each a title card that gives way to the Studio doing it.
// make.mjs cuts the take into media/ and writes parts/timeline.json (lengths, camera, lifts, clicks) and parts/lang.json.
import {Film, Layer, Line, Scene, Sound, Video, useTime} from '@motionhub/runtime';
import timeline from './parts/timeline.json';
import {Card, type Exit} from './parts/cards';
import {Studio, type Shot} from './parts/ui';
import {Prompt} from './parts/prompt';
import {Agents, Circle, FileCard, Voices} from './parts/drawn';
import {Faces, LANG, MUTED, PAPER, SANS, clamp01} from './parts/kit';
import {CHAPTERS, CLOSING, INTRO} from './parts/words';
import cardOpen from './media/card-open.mp4';
import cardClose from './media/card-close.mp4';
import uiIntro from './media/ui-intro.mp4';
import ui1 from './media/ui-ch1.mp4';
import ui2 from './media/ui-ch2.mp4';
import ui5 from './media/ui-ch5.mp4';
import ui6 from './media/ui-ch6.mp4';
import ovIntro from './media/ov-intro.mp4';
import ov1 from './media/ov-ch1.mp4';

export const film = {width: 1920, height: 1080, fps: 30};

// Chapters 3 and 4 are drawn whole; 1 and 5 begin drawn, 6 ends drawn.
const clips: Record<string, string> = {intro: uiIntro, ch1: ui1, ch2: ui2, ch5: ui5, ch6: ui6};
// The clean film laid over the recorded preview.
const overlays: Record<string, string> = {intro: ovIntro, ch1: ov1};
const drawn: Record<string, (p: {u: number}) => JSX.Element> = {ch1: Prompt, ch3: Circle, ch4: Agents, ch5: Voices, ch6: FileCard};
const EXIT = 0.4;

type SceneInfo = Shot & {id: string; kind: 'card' | 'chapter'; dur: number; card: number; exit: Exit; pre?: number; post?: number; beat0?: number};

function Chapter({info}: {info: SceneInfo}) {
  const t = useTime();
  const n = info.id === 'intro' ? 0 : Number(info.id.slice(2));
  const Drawn = drawn[info.id];
  const clip = clips[info.id];
  return (
    <>
      {/* A drawn part first, from its first beat, then the clip; or the clip, then a drawn part. */}
      {Drawn && !info.post && t >= info.uiStart && t < info.uiStart + (info.pre ?? 0) + (clip ? 0 : 1) && <Drawn u={t - info.uiStart - (info.beat0 ?? 0)} />}
      {clip && <Studio clip={clip} ov={overlays[info.id]} shot={{...info, uiStart: info.uiStart + (info.pre ?? 0)}} t={t} />}
      {Drawn && info.post ? t >= info.uiStart + info.uiLen && <Drawn u={t - info.uiStart - info.uiLen} /> : null}
      <Card n={n} t={t} card={info.card} exitLen={EXIT} exit={info.exit} />
    </>
  );
}

function Closing() {
  const t = useTime();
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 742, textAlign: 'center', font: `500 34px ${SANS}`, letterSpacing: '0.04em',
      color: MUTED, opacity: clamp01((t - 1.1) / 0.4)}}>{CLOSING[LANG]}</div>
  );
}

export default function Main() {
  const scenes = timeline.scenes as unknown as SceneInfo[];
  return (
    <Film>
      {/* make.mjs builds them: the music (sunk under the narration), the narration, and the effects a little under both. */}
      <Sound src="media/music-bed.wav" />
      <Sound src="media/narration.wav" />
      <Sound src="media/effects.wav" volume={-4.4} />
      <Layer id="ground"><Faces /><div style={{width: '100%', height: '100%', background: PAPER}} /></Layer>
      {scenes.map((s) => {
        if (s.id === 'open')
          return <Scene key={s.id} id="open" duration={s.dur}><Layer id="logo"><Video src={cardOpen} objectFit="contain" /></Layer></Scene>;
        if (s.id === 'close')
          return (
            <Scene key={s.id} id="close" duration={s.dur}>
              <Line id="close-line">{CLOSING[LANG]}</Line>
              <Layer id="logo"><Video src={cardClose} objectFit="contain" /></Layer>
              <Layer id="closing"><Closing /></Layer>
            </Scene>
          );
        const head = (s.id === 'intro' ? INTRO : CHAPTERS[Number(s.id.slice(2)) - 1]!).head[LANG].replace(/[*|]/g, '');
        return (
          <Scene key={s.id} id={s.id} duration={s.dur}>
            <Line id={`${s.id}-line`} dur={s.card}>{head}</Line>
            <Layer id="chapter"><Chapter info={s} /></Layer>
          </Scene>
        );
      })}
    </Film>
  );
}
