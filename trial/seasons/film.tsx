import {Film, Layer, Line, Scene, Sound, MotionScope} from '@motionhub/runtime';
import {C, FACE, T, BOX, FONTS, captionTokens, Heading, Enter} from './parts/kit';
import {Cover} from './parts/cover';
import {Distance} from './parts/distance';
import {Tilt} from './parts/tilt';
import {Light} from './parts/light';
import {Daylight} from './parts/daylight';
import {Summary} from './parts/summary';

/** A 45-second landscape explainer: why there are seasons. */
export const film = {width: 1920, height: 1080, fps: 30};

export default function Main() {
  return (
    <MotionScope tokens={captionTokens}>
      <Film captions>
        {/* Effects from oms's own sound, one cue per thing the picture does (see the cue list in the report). */}
        <Sound src="media/effects-2.wav" />
        <Layer id="ground">
          <style>{FONTS}</style>
          <div style={{width: '100%', height: '100%', background: C.paper}} />
        </Layer>

        <Scene id="cover" duration={6.5}>
          <Line id="cover-question" at={0} dur={2.1}>为什么会有四季？</Line>
          <Line id="cover-guess" at={2.2} dur={4}>很多人以为：夏天是因为地球离太阳更近。</Line>
          <Layer id="cover-title" {...BOX.heading} h={170}>
            <div style={{height: '100%', display: 'flex', alignItems: 'center', font: `700 ${T.cover}px/1.1 ${FACE}`, color: C.ink}}>为什么会有四季？</div>
          </Layer>
          <Layer id="guess-orbit" {...BOX.stage}><Cover /></Layer>
        </Scene>

        <Scene id="distance" duration={8}>
          <Line id="distance-farther" at={0.2} dur={4}>其实北半球过夏天时，地球离太阳反而略远。</Line>
          <Line id="distance-small" at={4.4} dur={3.3}>远近只差约3%，带不来冷热的差别。</Line>
          <Layer id="distance-heading" {...BOX.heading}><Heading>北半球的夏天，地球离太阳更远</Heading></Layer>
          <Layer id="true-orbit" {...BOX.stage}><Distance /></Layer>
        </Scene>

        <Scene id="tilt" duration={8}>
          <Line id="tilt-angle" at={0.2} dur={3.8}>真正的原因是：地轴是斜的，约23.4°。</Line>
          <Line id="tilt-same-way" at={4.1} dur={3.4}>绕太阳一圈，地轴始终斜向同一边。</Line>
          <Layer id="tilt-heading" {...BOX.heading}><Heading>真正的原因：地轴是斜的</Heading></Layer>
          <Layer id="tilted-earth" {...BOX.stage}><Enter><Tilt /></Enter></Layer>
        </Scene>

        <Scene id="light" duration={9}>
          <Line id="light-direct" at={0.2} dur={3.9}>阳光直射时，能量集中在一小块地面上。</Line>
          <Line id="light-slant" at={4.3} dur={4.4}>斜射时，同样的阳光铺得更开，地面就没那么热。</Line>
          <Layer id="light-heading" {...BOX.heading}><Heading>直射更热，斜射更凉</Heading></Layer>
          <Layer id="sun-beam" {...BOX.stage}><Enter><Light /></Enter></Layer>
        </Scene>

        <Scene id="daylight" duration={8.5}>
          <Line id="daylight-high" at={0.2} dur={3.7}>北半球的夏天，太阳升得高，白天也长。</Line>
          <Line id="daylight-beijing" at={4.1} dur={4.2}>以北京为例：夏至白天约15小时，冬至只有9小时多。</Line>
          <Layer id="daylight-heading" {...BOX.heading}><Heading>夏天：太阳更高，白天更长</Heading></Layer>
          <Layer id="sky-and-hours" {...BOX.stage}><Enter><Daylight /></Enter></Layer>
        </Scene>

        <Scene id="seasons" duration={7}>
          <Line id="seasons-sum" at={0.2} dur={3.6}>照得更直、更久，就更暖和——这就是四季。</Line>
          <Line id="seasons-south" at={3.9} dur={2.8}>而南半球的季节，正好相反。</Line>
          <Layer id="seasons-heading" {...BOX.heading}><Heading>地轴倾斜，带来四季</Heading></Layer>
          <Layer id="seasons-orbit" {...BOX.stage}><Enter><Summary /></Enter></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
