// 为什么天空是蓝色的？ A 47.5-second landscape explainer, drawn in Night Diagram (@iamsuosi/night-diagram).
import {Film, Layer, Line, Scene, MotionScope, Sound} from '@motionhub/runtime';
import tokens from './motions/@iamsuosi/night-diagram/tokens.json';
import {Sky} from './motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
// The motion names these faces but ships no files for them, so the film loads its own copies, subset to the
// characters it uses. All three are under the SIL Open Font License 1.1:
// Noto Sans SC, github.com/notofonts/noto-cjk; Hanken Grotesk and JetBrains Mono, github.com/google/fonts.
import notoSansSc from './media/fonts/noto-sans-sc.woff2';
import hankenGrotesk from './media/fonts/hanken-grotesk.woff2';
import jetbrainsMono from './media/fonts/jetbrains-mono.woff2';
// Sound effects: synthesized for this film with ffmpeg (sines and filtered noise, media/sfx/), no outside source.
// Only light makes a sound, as Night Diagram asks: a beam running, light scattering, the sky filling, blue leaving, red left.
import {SceneFade as Fade} from './parts/common.tsx';
import {CoverSky, CoverSun, CoverTitle} from './parts/cover.tsx';
import {Prism, Waves, SpectrumTitle} from './parts/spectrum.tsx';
import {Air, Closer, Ratio, ScatterTitle} from './parts/scatter.tsx';
import {BlueSky, ToTheEye, NotViolet, BlueTitle} from './parts/blue-sky.tsx';
import {SunsetSky, Earth, Paths, Thickness, SunsetTitle} from './parts/sunset.tsx';
import {TwoSkies, OneCause, EndingTitle} from './parts/ending.tsx';

/** The film's size and rate; its scenes decide its length. */
export const film = {width: 1920, height: 1080, fps: 30};

const FACES = `
@font-face { font-family: 'Noto Sans SC'; src: url(${notoSansSc}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Hanken Grotesk'; src: url(${hankenGrotesk}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'JetBrains Mono'; src: url(${jetbrainsMono}) format('woff2'); font-weight: 100 800; }
`;

export default function Main() {
  return (
    <MotionScope tokens={tokens}>
      <style>{FACES}</style>
      <Film captions>
        {/* One night field under every scene, so a cut never flashes another ground; each scene lights it its own way. */}
        <Layer id="ground"><Sky land={null} stars={70} /></Layer>

        <Scene id="cover" duration={5.5}>
          <Line id="cover-1" dur={2.6}>晴天抬头，天空是蓝的。</Line>
          <Line id="cover-2" at={2.6}>可阳光明明是白色的。</Line>
          <Layer id="clear-sky"><Fade dur={5.5} cover><CoverSky /></Fade></Layer>
          <Layer id="sun-and-beam" z={1}><Fade dur={5.5} cover><CoverSun pinAt={2.8} /></Fade></Layer>
          <Layer id="question" x={0} y={0} w={1300} h={420} z={2}><Fade dur={5.5} cover><CoverTitle /></Fade></Layer>
        </Scene>

        <Scene id="spectrum" duration={8}>
          <Sound src="media/sfx/shimmer.wav" at={0.3} volume={-12} />
          <Line id="spectrum-1" dur={3.9}>白色的阳光，其实混着彩虹的所有颜色。</Line>
          <Line id="spectrum-2" at={3.9}>红光的波长较长，蓝光的波长较短。</Line>
          <Layer id="prism-and-pins" z={1}><Fade dur={8}><Prism pinsAt={4.1} /></Fade></Layer>
          <Layer id="wave-lengths" x={1340} y={530} w={500} h={300} z={2}><Fade dur={8}><Waves at={4.1} /></Fade></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={3}><Fade dur={8}><SpectrumTitle /></Fade></Layer>
        </Scene>

        <Scene id="scatter" duration={13}>
          <Sound src="media/sfx/sweep-low.wav" at={0.4} volume={-14} />
          <Sound src="media/sfx/whoosh.wav" at={4.2} volume={-12} />
          <Sound src="media/sfx/sparkle.wav" at={4.9} volume={-10} />
          <Sound src="media/sfx/knock.wav" at={8.7} volume={-14} />
          <Sound src="media/sfx/leaving.wav" at={8.8} volume={-14} />
          <Line id="scatter-1" dur={4}>阳光穿过大气，会撞上无数空气分子。</Line>
          <Line id="scatter-2" at={4} dur={4.4}>分子把光弹向四面八方，这叫瑞利散射。</Line>
          <Line id="scatter-3" at={8.4}>波长越短散射越强，蓝光约是红光的六倍。</Line>
          <Layer id="air-and-beam" z={1}><Fade dur={13}><Air dimAt={4.2} /></Fade></Layer>
          <Layer id="molecule-lens" z={2}><Fade dur={13}><Closer lensAt={4.2} ratioAt={8.6} /></Fade></Layer>
          <Layer id="ratio-reading" x={60} y={540} w={1000} h={320} z={3}><Fade dur={13}><Ratio at={8.6} /></Fade></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={3}><Fade dur={13}><ScatterTitle /></Fade></Layer>
        </Scene>

        <Scene id="blue-sky" duration={7}>
          <Sound src="media/sfx/swell.wav" at={3.6} volume={-12} />
          <Line id="blue-sky-1" dur={3.4}>散开的蓝光，从天空各处来到你眼前。</Line>
          <Line id="blue-sky-2" at={3.4}>所以，整片天空看起来都是蓝的。</Line>
          <Layer id="day-sky"><Fade dur={7}><BlueSky fillAt={3.6} /></Fade></Layer>
          <Layer id="rays-to-eye" z={1}><Fade dur={7}><ToTheEye /></Fade></Layer>
          <Layer id="not-violet" x={1160} y={170} w={720} h={200} z={2}><Fade dur={7}><NotViolet at={4.4} /></Fade></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={2}><Fade dur={7}><BlueTitle /></Fade></Layer>
        </Scene>

        <Scene id="sunset" duration={9.5}>
          <Sound src="media/sfx/sweep-low.wav" at={1.0} volume={-12} />
          <Sound src="media/sfx/knock.wav" at={2.6} volume={-14} />
          <Sound src="media/sfx/leaving.wav" at={4.3} volume={-10} />
          <Sound src="media/sfx/warm.wav" at={4.5} volume={-10} />
          <Line id="sunset-1" dur={4}>傍晚，阳光要斜穿厚得多的空气。</Line>
          <Line id="sunset-2" at={4}>蓝光一路被散掉，剩下的红橙光染红了夕阳。</Line>
          <Layer id="evening-sky"><Fade dur={9.5}><SunsetSky redAt={4.3} /></Fade></Layer>
          <Layer id="earth-and-air" z={1}><Fade dur={9.5}><Earth /></Fade></Layer>
          <Layer id="light-paths" z={2}><Fade dur={9.5}><Paths longAt={0.8} redAt={4.3} /></Fade></Layer>
          <Layer id="air-reading" x={1160} y={450} w={740} h={340} z={3}><Fade dur={9.5}><Thickness at={2.6} /></Fade></Layer>
          <Layer id="heading" x={0} y={0} w={1300} h={200} z={3}><Fade dur={9.5}><SunsetTitle /></Fade></Layer>
        </Scene>

        <Scene id="one-cause" duration={4.5}>
          <Sound src="media/sfx/resolve.wav" at={1.0} volume={-8} />
          <Line id="one-cause-1">蓝天和晚霞，来自同一种散射。</Line>
          <Layer id="two-skies"><TwoSkies /></Layer>
          <Layer id="molecule" z={1}><OneCause /></Layer>
          <Layer id="heading" x={0} y={0} w={1400} h={200} z={2}><EndingTitle /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
