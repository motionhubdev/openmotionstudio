// Why does the Moon have phases? A 45-second landscape explainer for people who never studied astronomy, in a look
// of its own (parts/kit.tsx): a lunar observer's chart at night. Every diagram is illustrative, not to scale.
import {Film, Layer, Line, MotionScope, Scene, Sound} from '@motionhub/runtime';
import {Fonts} from './parts/fonts.tsx';
import {Ground, TOKENS, Title} from './parts/kit.tsx';
import {CoverMoon} from './parts/cover.tsx';
import {Sunlit} from './parts/sunlit.tsx';
import {EndingScene, MythScene, OrbitScene} from './parts/orbit.tsx';

export const film = {width: 1920, height: 1080, fps: 30};

export default function Main() {
  return (
    <MotionScope tokens={TOKENS}>
    <Film captions>
      {/* Effects in oms's own sound (the film draws in no motion), cued to the picture by `oms sound`; no music. */}
      <Sound src="media/effects-1.wav" />
      <Layer id="night">
        <Fonts />
        <Ground />
      </Layer>

      <Scene id="cover" duration={6}>
        <Line id="cover-question">月亮为什么有时圆，有时弯？</Line>
        <Layer id="cover-moon"><CoverMoon /></Layer>
        <Layer id="cover-title" z={1}><Title cover text="月亮为什么有圆缺？" sub="同一个月亮，每晚样子都不同" /></Layer>
      </Scene>

      <Scene id="sunlit" duration={8}>
        <Line id="sunlit-reflect" dur={3.8}>月亮自己不发光，靠反射太阳光。</Line>
        <Line id="sunlit-half" at={3.8}>所以它总有一半被照亮。</Line>
        <Layer id="sun-and-moon"><Sunlit /></Layer>
        <Layer id="sunlit-title" z={1}><Title text="月光从哪里来？" sub="月光 = 反射的阳光" subAt={1.4} /></Layer>
      </Scene>

      <Scene id="orbit" duration={17}>
        <Line id="orbit-lap" dur={3.6}>月亮绕地球转一圈，约 29.5 天。</Line>
        <Line id="orbit-new" at={3.6} dur={3.4}>新月：亮面背对我们，几乎看不见。</Line>
        <Line id="orbit-first" at={7.0} dur={3.2}>上弦：看到右边亮的一半。</Line>
        <Line id="orbit-full" at={10.2} dur={3.0}>满月：亮面正对我们。</Line>
        <Line id="orbit-last" at={13.2}>下弦：只剩左边亮的一半。</Line>
        <Layer id="orbit-and-phases"><OrbitScene /></Layer>
        <Layer id="orbit-title" z={1}><Title text="月亮绕着地球转" sub="俯视示意 · 外圈是从地球看到的样子" subAt={3.8} /></Layer>
      </Scene>

      <Scene id="myth" duration={9}>
        <Line id="myth-not-shadow" dur={3.8}>弯月不是地球的影子挡住的。</Line>
        <Line id="myth-eclipse" at={3.8}>地球影子落上月亮，那是月食，只在满月偶尔发生。</Line>
        <Layer id="shadow-diagram"><MythScene /></Layer>
        <Layer id="myth-title" z={1}><Title text="是地球的影子吗？" sub="影子总在背着太阳的一侧" subAt={1.6} /></Layer>
      </Scene>

      <Scene id="ending" duration={5}>
        <Line id="ending-angle">圆缺，只是我们看亮面的角度在变。</Line>
        <Layer id="phases-diagram"><EndingScene /></Layer>
        <Layer id="ending-title" z={1}><Title text="亮面始终朝着太阳" sub="每 29.5 天，圆缺轮回一次" /></Layer>
      </Scene>
    </Film>
    </MotionScope>
  );
}
