// 为什么天空是蓝色的？ A 45-second landscape explainer, drawn in Night Diagram (@iamsuosi/night-diagram).
import {Film, Layer, Line, Scene, MotionScope} from '@motionhub/runtime';
import tokens from './motions/@iamsuosi/night-diagram/tokens.json';
import {C} from './parts/common.tsx';
import {CoverSky, CoverSun, CoverTitle} from './parts/cover.tsx';
import {SpectrumSky, Prism, Waves, SpectrumTitle} from './parts/spectrum.tsx';
import {ScatterSky, Air, Closer, Ratio, ScatterTitle} from './parts/scatter.tsx';
import {BlueSky, ToTheEye, BlueTitle} from './parts/blue-sky.tsx';
import {SunsetSky, Earth, Paths, Thickness, SunsetTitle} from './parts/sunset.tsx';
import {TwoSkies, OneCause, EndingTitle} from './parts/ending.tsx';

/** The film's size and rate; its scenes decide its length. */
export const film = {width: 1920, height: 1080, fps: 30};

export default function Main() {
  return (
    <MotionScope tokens={tokens}>
      <Film captions>
        <Layer id="ground">
          <div style={{width: '100%', height: '100%', background: C.deep}} />
        </Layer>

        <Scene id="cover" duration={5.5}>
          <Line id="cover-1" dur={2.6}>晴天抬头，天空是蓝的。</Line>
          <Line id="cover-2" at={2.6}>可阳光明明是白色的。</Line>
          <Layer id="clear-sky"><CoverSky /></Layer>
          <Layer id="sun-and-beam" z={1}><CoverSun pinAt={2.8} /></Layer>
          <Layer id="question" x={0} y={0} w={1300} h={420} z={2}><CoverTitle /></Layer>
        </Scene>

        <Scene id="spectrum" duration={8}>
          <Line id="spectrum-1" dur={3.9}>白色的阳光，其实混着彩虹的所有颜色。</Line>
          <Line id="spectrum-2" at={3.9}>红光的波长较长，蓝光的波长较短。</Line>
          <Layer id="night"><SpectrumSky /></Layer>
          <Layer id="prism-and-pins" z={1}><Prism pinsAt={4.1} /></Layer>
          <Layer id="wave-lengths" x={1340} y={530} w={500} h={300} z={2}><Waves at={4.1} /></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={3}><SpectrumTitle /></Layer>
        </Scene>

        <Scene id="scatter" duration={13}>
          <Line id="scatter-1" dur={4}>阳光穿过大气，会撞上无数空气分子。</Line>
          <Line id="scatter-2" at={4} dur={4.4}>分子把光弹向四面八方，这叫瑞利散射。</Line>
          <Line id="scatter-3" at={8.4}>波长越短散射越强，蓝光约是红光的六倍。</Line>
          <Layer id="night"><ScatterSky /></Layer>
          <Layer id="air-and-beam" z={1}><Air dimAt={4.2} /></Layer>
          <Layer id="molecule-lens" z={2}><Closer lensAt={4.2} ratioAt={8.6} /></Layer>
          <Layer id="ratio-reading" x={60} y={540} w={1000} h={320} z={3}><Ratio at={8.6} /></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={3}><ScatterTitle /></Layer>
        </Scene>

        <Scene id="blue-sky" duration={7}>
          <Line id="blue-sky-1" dur={3.4}>散开的蓝光，从天空各处来到你眼前。</Line>
          <Line id="blue-sky-2" at={3.4}>所以，整片天空看起来都是蓝的。</Line>
          <Layer id="day-sky"><BlueSky fillAt={3.6} /></Layer>
          <Layer id="rays-to-eye" z={1}><ToTheEye /></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={2}><BlueTitle /></Layer>
        </Scene>

        <Scene id="sunset" duration={9.5}>
          <Line id="sunset-1" dur={4}>傍晚，阳光要斜穿厚得多的空气。</Line>
          <Line id="sunset-2" at={4}>蓝光一路被散掉，剩下的红橙光染红了夕阳。</Line>
          <Layer id="evening-sky"><SunsetSky redAt={4.3} /></Layer>
          <Layer id="earth-and-air" z={1}><Earth /></Layer>
          <Layer id="light-paths" z={2}><Paths longAt={0.8} redAt={4.3} /></Layer>
          <Layer id="air-reading" x={1160} y={450} w={740} h={340} z={3}><Thickness at={2.6} /></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={3}><SunsetTitle /></Layer>
        </Scene>

        <Scene id="one-cause" duration={4.5}>
          <Line id="one-cause-1">蓝天和晚霞，来自同一种散射。</Line>
          <Layer id="two-skies"><TwoSkies /></Layer>
          <Layer id="molecule" z={1}><OneCause /></Layer>
          <Layer id="heading" x={0} y={0} w={1400} h={200} z={2}><EndingTitle /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
