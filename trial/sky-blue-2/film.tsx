// Why is the sky blue? A 47-second explainer for people who never studied physics, in Night Diagram's look:
// the sky's blue, the sun and every beam are lights in a dark diagram, so the light the film is about is always the brightest thing.
import {Film, Layer, Line, MotionScope, Scene, Sound, useTime} from '@motionhub/runtime';
import tokens from './motions/@iamsuosi/night-diagram/tokens.json';
import {Heading} from './motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {C, ease} from './parts/light.tsx';
import {IntroPins, IntroSky, IntroSun} from './parts/intro.tsx';
import {Ends, Prism, SpectrumSky} from './parts/spectrum.tsx';
import {Molecule, Ratio, Scattered, ScatterPins, ScatterSky, Waves} from './parts/scatter.tsx';
import {Beam, EverywhereSky, ToTheEye, Viewer} from './parts/everywhere.tsx';
import {AirMass, Dusk, LostBlue, Noon, Planet, SunsetPins, SunsetSky} from './parts/sunset.tsx';
// Night Diagram's faces, which its download did not carry (no react/fonts/): taken from Google Fonts (github.com/google/fonts, ofl/),
// SIL Open Font License 1.1, licences beside them in media/fonts/. Noto Sans SC is cut to GB2312's characters to keep it small.
import hanken from './media/fonts/hanken-grotesk.woff2';
import notoSC from './media/fonts/noto-sans-sc-gb2312.woff2';
import jetbrains from './media/fonts/jetbrains-mono.woff2';

const FACES = `
@font-face { font-family: 'Hanken Grotesk'; src: url(${hanken}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Noto Sans SC'; src: url(${notoSC}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'JetBrains Mono'; src: url(${jetbrains}) format('woff2'); font-weight: 100 900; }
`;

export const film = {width: 1920, height: 1080, fps: 30};

/** A scene's question, top left; the cover's is there from frame 0. */
function Question({text, sub, cover = false}: {text: string; sub?: string; cover?: boolean}) {
  const t = useTime();
  return <Heading text={text} sub={sub} size={76} show={cover ? 1 : ease(t, 0, 0.5)} sharp={cover ? 1 : ease(t, 0.3, 0.8)} />;
}

export default function Main() {
  return (
    <MotionScope tokens={tokens}>
      <style>{FACES}</style>
      <Film captions>
        {/* every effect, cued to the picture, in Night Diagram's own sound (oms sound) */}
        <Sound src="media/effects-2.wav" />
        <Layer id="ground"><div style={{width: '100%', height: '100%', background: C.deep}} /></Layer>

        <Scene id="intro" duration={6.5}>
          <Line id="intro-blue" at={0} dur={2.9}>抬头看，晴天的天空是蓝的。</Line>
          <Line id="intro-white" at={3.1} dur={2.9}>可阳光是白的，蓝色从哪来？</Line>
          <Layer id="blue-sky"><IntroSky /></Layer>
          <Layer id="sun" z={1}><IntroSun /></Layer>
          <Layer id="sky-pins" z={2}><IntroPins /></Layer>
          <Layer id="question" z={3}><Question text="为什么天空是蓝色的？" sub="一束阳光，和一整片空气" cover /></Layer>
        </Scene>

        <Scene id="spectrum" duration={8.6}>
          <Line id="spectrum-mix" at={0.2} dur={3.3}>白光其实是各种颜色的光混在一起。</Line>
          <Line id="spectrum-split" at={3.8} dur={3.8}>三棱镜把它分开：红光波长长，蓝光波长短。</Line>
          <Layer id="field"><SpectrumSky /></Layer>
          <Layer id="prism" z={1}><Prism /></Layer>
          <Layer id="wavelengths" z={2}><Ends /></Layer>
          <Layer id="question" z={3}><Question text="白光里藏着彩虹" sub="把一束阳光拆开看" /></Layer>
        </Scene>

        <Scene id="scatter" duration={13}>
          <Line id="scatter-meet" at={0.2} dur={3.4}>阳光进入大气，会撞上空气分子。</Line>
          <Line id="scatter-blue" at={3.9} dur={4}>分子把蓝光弹向四面八方，红光大多直直穿过。</Line>
          <Line id="scatter-name" at={8.3} dur={3.6}>这叫瑞利散射：蓝光被散射得比红光强约六倍。</Line>
          <Layer id="field"><ScatterSky /></Layer>
          <Layer id="light-waves" z={1}><Waves /></Layer>
          <Layer id="scattered-blue" z={2}><Scattered /></Layer>
          <Layer id="molecule" z={3}><Molecule /></Layer>
          <Layer id="scatter-pins" z={4}><ScatterPins /></Layer>
          <Layer id="ratio" z={5}><Ratio /></Layer>
          <Layer id="question" z={6}><Question text="空气分子把蓝光弹开" sub="波长越短，被弹得越厉害" /></Layer>
        </Scene>

        <Scene id="everywhere" duration={8}>
          <Line id="everywhere-eye" at={0.2} dur={3.4}>散开的蓝光从天空各处射进眼睛。</Line>
          <Line id="everywhere-sky" at={3.9} dur={3.1}>所以不管朝哪看，天空都是蓝的。</Line>
          <Layer id="blue-sky"><EverywhereSky /></Layer>
          <Layer id="sunbeam" z={1}><Beam /></Layer>
          <Layer id="blue-to-eye" z={2}><ToTheEye /></Layer>
          <Layer id="viewer" z={3}><Viewer /></Layer>
          <Layer id="question" z={4}><Question text="为什么满天都是蓝的？" sub="每一处空气都在送来蓝光" /></Layer>
        </Scene>

        <Scene id="sunset" duration={11}>
          <Line id="sunset-long" at={0.2} dur={4}>傍晚阳光斜着来，要穿过厚得多的空气。</Line>
          <Line id="sunset-lost" at={4.5} dur={3.5}>蓝光一路被散掉，剩下红光和橙光。</Line>
          <Line id="sunset-red" at={8.3} dur={1.7}>所以夕阳是红的。</Line>
          <Layer id="dusk-sky"><SunsetSky /></Layer>
          <Layer id="planet" z={1}><Planet /></Layer>
          <Layer id="noon-sun" z={2}><Noon /></Layer>
          <Layer id="dusk-sun" z={3}><Dusk /></Layer>
          <Layer id="lost-blue" z={4}><LostBlue /></Layer>
          <Layer id="sunset-pins" z={5}><SunsetPins /></Layer>
          <Layer id="air-mass" z={6}><AirMass /></Layer>
          <Layer id="question" z={7}><Question text="为什么夕阳是红的？" sub="同一束阳光，走了更远的路" /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
