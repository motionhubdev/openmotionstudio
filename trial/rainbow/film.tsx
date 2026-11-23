// 彩虹为什么是弯的？ A 39-second portrait explainer, captions only, effects from `oms sound`.
import {Film, Layer, Line, Scene, Sound, MotionScope, useTime, interpolate, Easing} from '@motionhub/runtime';
import {C, T, BOX, FACE, Heading, captionTokens} from './parts/kit';
import noto_sans_sc_400 from './media/fonts/noto-sans-sc-400.ttf';
import noto_sans_sc_700 from './media/fonts/noto-sans-sc-700.ttf';
import {CoverPicture} from './parts/cover';
import {DropPicture} from './parts/drop';
import {AnglePicture} from './parts/angle';
import {ConePicture} from './parts/cone';
import {GroundPicture} from './parts/ground';
import {EndingPicture} from './parts/ending';

/** The film's size and rate; its scenes decide its length. */
export const film = {width: 1080, height: 1920, fps: 30};

/** A heading that gives way to a second one at `swap` seconds into its scene. */
function SwapHeading({first, second, swap}: {first: string; second: string; swap: number}) {
  const t = useTime();
  const out = interpolate(t, [swap, swap + 0.4], [1, 0], {easing: Easing.inOutCubic, clamp: true});
  const inn = interpolate(t, [swap + 0.4, swap + 0.9], [0, 1], {easing: Easing.outCubic, clamp: true});
  return (
    <div style={{position: 'relative', height: '100%'}}>
      <div style={{position: 'absolute', inset: 0, opacity: out}}><Heading>{first}</Heading></div>
      <div style={{position: 'absolute', inset: 0, opacity: inn}}><Heading cover>{second}</Heading></div>
    </div>
  );
}

export default function Main() {
  return (
    <MotionScope tokens={captionTokens}>
      <Film captions>
        <Sound src="media/effects.wav" />
        <Layer id="ground">
          <style>{`
            @font-face { font-family: 'Noto Sans SC'; font-weight: 400; src: url(${noto_sans_sc_400}); }
            @font-face { font-family: 'Noto Sans SC'; font-weight: 700; src: url(${noto_sans_sc_700}); }
          `}</style>
          <div style={{width: '100%', height: '100%', background: `radial-gradient(circle at 50% 38%, ${C.cloud} 0%, ${C.ground} 70%)`}} />
        </Layer>

        <Scene id="cover" duration={4}>
          <Line id="cover-question">彩虹为什么是弯的？</Line>
          <Layer id="cover-title" {...BOX.head} h={330}>
            <Heading cover size={T.cover}>彩虹为什么<br />是弯的？</Heading>
          </Layer>
          <Layer id="cover-rainbow" x={0} y={520} w={1080} h={1400}><CoverPicture /></Layer>
        </Scene>

        <Scene id="drop" duration={8}>
          <Line id="drop-in">阳光射进雨滴，拐了个弯。</Line>
          <Line id="drop-back">在雨滴背面，又反射回来。</Line>
          <Line id="drop-out">射出时再拐一次，颜色就散开了。</Line>
          <Layer id="drop-heading" {...BOX.head}><Heading>一滴雨里的光</Heading></Layer>
          <Layer id="drop-path" {...BOX.figure}><DropPicture /></Layer>
        </Scene>

        <Scene id="angle" duration={8}>
          <Line id="angle-red" dur={3.6}>射回的红光和阳光约成 42° 最亮。</Line>
          <Line id="angle-drops" at={4} dur={2.2}>只有和你视线成 42° 的雨滴，</Line>
          <Line id="angle-eye" at={6.2} dur={1.8}>才把红光送进你眼里。</Line>
          <Layer id="angle-heading" {...BOX.head}><Heading>神奇的 42°</Heading></Layer>
          <Layer id="angle-diagram" {...BOX.figure}><AnglePicture /></Layer>
        </Scene>

        <Scene id="cone" duration={8}>
          <Line id="cone-shape" dur={2.2}>这些雨滴连起来，是一个圆锥，</Line>
          <Line id="cone-tip" at={2.2} dur={1.8}>圆锥的尖，就是你的眼睛。</Line>
          <Line id="cone-circle" at={4}>从尖上望出去，圆锥的边是一个圆。</Line>
          <Layer id="cone-heading" {...BOX.head}><SwapHeading first="一个圆锥" second="看过去是个圆" swap={4.1} /></Layer>
          <Layer id="cone-drawing" {...BOX.figure}><ConePicture /></Layer>
        </Scene>

        <Scene id="ground-plane" duration={7}>
          <Line id="ground-hides">地面挡住了下半圈，只剩一段圆弧。</Line>
          <Line id="plane-full">在飞机上，有时能看到整圈彩虹。</Line>
          <Layer id="ground-heading" {...BOX.head}><SwapHeading first="地面挡住下半圈" second="在飞机上看" swap={3.6} /></Layer>
          <Layer id="ground-circle" x={0} y={400} w={1080} h={1520}><GroundPicture /></Layer>
        </Scene>

        <Scene id="ending" duration={4}>
          <Line id="ending-line">下次看见彩虹，记得它其实是一个圆。</Line>
          <Layer id="ending-heading" {...BOX.head}><Heading>其实是一个圆</Heading></Layer>
          <Layer id="ending-circle" {...BOX.figure}><EndingPicture /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
