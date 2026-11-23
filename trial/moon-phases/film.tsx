// Why does the Moon have phases? A 45-second landscape explainer for people who never studied astronomy,
// drawn in Night Diagram (motions/@iamsuosi/night-diagram). The Sun is the one light (ember); Earth, the side we
// look from, is ice. Every diagram is illustrative, not to scale.
import {Easing, Film, Layer, Line, MotionScope, Scene, Sound, interpolate, useTime} from '@motionhub/runtime';
import tokens from './motions/@iamsuosi/night-diagram/tokens.json';
import {Sky} from './motions/@iamsuosi/night-diagram/react/parts/sky.tsx';
import {Heading} from './motions/@iamsuosi/night-diagram/react/parts/heading.tsx';
import {Fonts} from './parts/fonts.tsx';
import {Cover} from './parts/cover.tsx';
import {Sunlit} from './parts/sunlit.tsx';
import {EndingScene, MythScene, OrbitScene} from './parts/orbit.tsx';

export const film = {width: 1920, height: 1080, fps: 30};

/** A scene's question, top left, arriving with the scene; its quiet line follows at `sharpAt` seconds. */
function SceneHeading({text, sub, sharpAt = 0.6}: {text: string; sub: string; sharpAt?: number}) {
  const t = useTime();
  const ease = {easing: Easing.inOutCubic, clamp: true} as const;
  return <Heading text={text} sub={sub} at={[80, 64]} size={76} show={interpolate(t, [0, 0.5], [0, 1], ease)} sharp={interpolate(t, [sharpAt, sharpAt + 0.6], [0, 1], ease)} />;
}

export default function Main() {
  return (
    <MotionScope tokens={tokens}>
      <Film captions>
        {/* Effects in Night Diagram's own sound, cued to the picture by `oms sound` (no music: the track plays as mixed). */}
        <Sound src="media/effects-1.wav" />
        <Layer id="night-sky">
          <Fonts />
          <Sky land={null} stars={90} />
        </Layer>

        <Scene id="cover" duration={6}>
          <Line id="cover-question">月亮为什么有时圆，有时弯？</Line>
          <Layer id="cover-moon"><Cover /></Layer>
        </Scene>

        <Scene id="sunlit" duration={8}>
          <Line id="sunlit-reflect" dur={3.8}>月亮自己不发光，靠反射太阳光。</Line>
          <Line id="sunlit-half" at={3.8}>所以它总有一半被照亮。</Line>
          <Layer id="sun-and-moon"><Sunlit /></Layer>
        </Scene>

        <Scene id="orbit" duration={17}>
          <Line id="orbit-lap" dur={3.6}>月亮绕地球转一圈，约 29.5 天。</Line>
          <Line id="orbit-new" at={3.6} dur={3.4}>新月：亮面背对我们，几乎看不见。</Line>
          <Line id="orbit-first" at={7.0} dur={3.2}>上弦：看到右边亮的一半。</Line>
          <Line id="orbit-full" at={10.2} dur={3.0}>满月：亮面正对我们。</Line>
          <Line id="orbit-last" at={13.2}>下弦：只剩左边亮的一半。</Line>
          <Layer id="orbit-diagram"><OrbitScene /></Layer>
          <Layer id="orbit-heading" z={1}><SceneHeading text="月亮绕着地球转" sub="从北极上空俯视 · 示意图，不按比例" /></Layer>
        </Scene>

        <Scene id="myth" duration={9}>
          <Line id="myth-not-shadow" dur={3.8}>弯月不是地球的影子挡住的。</Line>
          <Line id="myth-eclipse" at={3.8}>地球影子落上月亮，那是月食，只在满月偶尔发生。</Line>
          <Layer id="shadow-diagram"><MythScene /></Layer>
          <Layer id="myth-heading" z={1}><SceneHeading text="是地球的影子挡住了吗？" sub="不是。那是另一回事：月食" sharpAt={4.0} /></Layer>
        </Scene>

        <Scene id="ending" duration={5}>
          <Line id="ending-angle">圆缺，只是我们看亮面的角度在变。</Line>
          <Layer id="phases-diagram"><EndingScene /></Layer>
          <Layer id="ending-heading" z={1}><SceneHeading text="亮的一半，始终朝着太阳" sub="每 29.5 天，圆缺轮回一次" /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
