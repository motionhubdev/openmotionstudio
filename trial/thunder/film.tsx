// Why is lightning seen before thunder is heard? A 40-second explainer, narrated from the person's own take.
import {Film, Layer, Line, MotionScope, Scene, Sound} from '@motionhub/runtime';
import {C, Heading, captionTokens, fontFaces} from './parts/kit';
import {CoverStorm, CoverTitle} from './parts/cover';
import {SameFacts, Strike} from './parts/same-time';
import {RaceTimes, RaceTrack} from './parts/race';
import {CountLine, Rule} from './parts/count';

export const film = {width: 1920, height: 1080, fps: 30};

export default function Main() {
  return (
    <MotionScope tokens={captionTokens}>
      <style>{fontFaces}</style>
      <Film voice="recording:take" captions="words">
        {/* oms's own effects, cued to the picture; 5 dB under, so the narration stays on top */}
        <Sound src="media/effects.wav" volume={-5} />
        <Layer id="ground"><div style={{width: '100%', height: '100%', background: C.ground}} /></Layer>

        <Scene id="cover" duration={4.4}>
          <Line id="cover-ask" at={0.3}>为什么总是先看到闪电，后听到雷声？</Line>
          <Layer id="question" x={140} y={250} w={880} h={420}><CoverTitle /></Layer>
          <Layer id="storm" x={1060} y={80} w={760} h={780}><CoverStorm /></Layer>
        </Scene>

        <Scene id="same-time" duration={11}>
          <Line id="same-born" at={0.3}>其实，闪电和雷声是同时产生的。</Line>
          <Line id="same-why" at={4.1}>闪电把空气瞬间烧到几万度，空气猛地膨胀，炸出了雷声。</Line>
          <Layer id="heading" x={140} y={70} w={1640} h={130}><Heading>同一道闪电，同时产生</Heading></Layer>
          <Layer id="strike" x={140} y={220} w={980} h={660}><Strike /></Layer>
          <Layer id="facts" x={1180} y={220} w={600} h={660}><SameFacts /></Layer>
        </Scene>

        <Scene id="race" duration={10.4}>
          <Line id="race-light" at={0.3} text="光每秒能走大约 30 万公里，几乎一眨眼就到了。">光每秒能走大约三十万公里，几乎一眨眼就到了。</Line>
          <Line id="race-sound" at={5.6} text="声音每秒只走大约 340 米，要慢得多。">声音每秒只走大约三百四十米，要慢得多。</Line>
          <Layer id="heading" x={140} y={70} w={1640} h={130}><Heading>光和声，赛跑 3 公里</Heading></Layer>
          <Layer id="track" x={140} y={210} w={1640} h={600}><RaceTrack /></Layer>
          <Layer id="arrivals" x={140} y={810} w={1640} h={80}><RaceTimes /></Layer>
        </Scene>

        <Scene id="count" duration={14.2}>
          <Line id="count-start" at={0.3}>所以看到闪电，就开始数秒，直到听见雷声。</Line>
          <Line id="count-rule" at={5.1} text="把秒数除以 3，就大约是雷暴离你几公里。">把秒数除以三，就大约是雷暴离你几公里。</Line>
          <Line id="count-example" at={9.5} text="数到 6 秒，雷暴大约在 2 公里外。">数到六秒，雷暴大约在两公里外。</Line>
          <Layer id="heading" x={140} y={70} w={1640} h={130}><Heading>数秒，算距离</Heading></Layer>
          <Layer id="timeline" x={140} y={230} w={1640} h={300}><CountLine /></Layer>
          <Layer id="rule" x={340} y={580} w={1240} h={260}><Rule /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
