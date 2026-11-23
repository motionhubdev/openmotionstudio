// 地球变暖了多少？ A 48-second data explainer drawn in @iamsuosi/stage-light.
// Figures: Berkeley Earth (the record, re-based on 1850-1900; see parts/data.ts) and IPCC AR6 WG1 SPM, Figure SPM.6 (hot extremes).
import {Film, Layer, Line, MotionScope, Scene, Sound, useCompositionTime} from '@motionhub/runtime';
import tokens from './motions/@iamsuosi/stage-light/tokens.json';
import {Stage} from './motions/@iamsuosi/stage-light/react/parts/stage.tsx';
import {Kicker} from './motions/@iamsuosi/stage-light/react/parts/kicker.tsx';
import {BOX, FadeIn, SCENES, Source, lightAt} from './parts/kit.tsx';
import {Record, RecordSilhouette} from './parts/record.tsx';
import {Tail} from './parts/tail.tsx';
import {Extremes} from './parts/extremes.tsx';
import {Fonts} from './parts/fonts.tsx';

export const film = {width: 1920, height: 1080, fps: 30};

/** The stage under every scene; its light follows the film's own clock (parts/kit.tsx, STOPS) */
function Ground() {
  const l = lightAt(useCompositionTime());
  return <Stage spotX={l.x} spotY={l.y} spotR={l.r} />;
}

export default function Main() {
  return (
    <MotionScope tokens={tokens}>
      <Film captions>
        {/* Effects made by `oms sound` in Stage Light's own sound (react/sound.json), cued to the picture; no music. */}
        <Sound src="media/effects.wav" />
        <Layer id="stage"><Fonts /><Ground /></Layer>

        <Scene id="cover" duration={SCENES.cover}>
          <Line id="cover-1">地球变暖了多少？用数据说话。</Line>
          <Layer id="cover-title" x={160} y={64} w={1600} h={206}>
            <Kicker eyebrow="一部数据短片 · 1850–2024" title="地球变暖了多少？" size={160} />
          </Layer>
          <Layer id="cover-record" {...BOX.stage}><RecordSilhouette /></Layer>
        </Scene>

        <Scene id="record" duration={SCENES.record}>
          <Line id="record-1" dur={5.6}>这是1850年以来每年的全球平均气温，零线是工业化前的水平。</Line>
          <Line id="record-2" at={5.8}>近十年平均已高出约1.3 °C，2024年单年达1.6 °C。</Line>
          <Layer id="record-heading" {...BOX.heading}>
            <FadeIn><Kicker eyebrow="全球平均气温 · 1850–2024" title="升高了多少？" size={110} /></FadeIn>
          </Layer>
          <Layer id="temperature-chart" {...BOX.stage}>
            <FadeIn><Record mode="record" /></FadeIn>
          </Layer>
          <Layer id="record-source" {...BOX.source}>
            <FadeIn><Source>数据：Berkeley Earth 陆地+海洋年均气温，按 1850–1900 年平均重新取零点（本片计算）</Source></FadeIn>
          </Layer>
        </Scene>

        <Scene id="when" duration={SCENES.when}>
          <Line id="when-1" dur={3.8}>升温主要发生在1970年代以后。</Line>
          <Line id="when-2" at={4.4}>此前约一百年升了0.35 °C，此后约五十年升了约1 °C。</Line>
          <Layer id="when-heading" {...BOX.heading}>
            <FadeIn><Kicker eyebrow="升温发生在何时" title="大多在近五十年" size={110} /></FadeIn>
          </Layer>
          <Layer id="temperature-chart" {...BOX.stage}><Record mode="when" /></Layer>
          <Layer id="when-source" {...BOX.source}>
            <FadeIn><Source>十年平均：1970–1979 年与 2015–2024 年，据 Berkeley Earth 数据计算，相对 1850–1900 年</Source></FadeIn>
          </Layer>
        </Scene>

        <Scene id="tail" duration={SCENES.tail}>
          <Line id="tail-1" dur={4}>零点几度的平均值，看似很小。</Line>
          <Line id="tail-2" at={4.4}>可整个分布右移一点，罕见的高温就会多出很多。</Line>
          <Layer id="tail-heading" {...BOX.heading}>
            <FadeIn><Kicker eyebrow="为什么零点几度很重要" title="平均值背后是极端" size={110} /></FadeIn>
          </Layer>
          <Layer id="heat-curve" {...BOX.stage}><FadeIn><Tail /></FadeIn></Layer>
          <Layer id="tail-source" {...BOX.source}>
            <FadeIn><Source>示意图：钟形曲线代表每日气温的分布，形状与移动幅度均为示意，不是实测数据</Source></FadeIn>
          </Layer>
        </Scene>

        <Scene id="extremes" duration={SCENES.extremes}>
          <Line id="extremes-1" dur={5}>过去十年一遇的高温，如今每十年约出现2.8次。</Line>
          <Line id="extremes-2" at={5.4}>升温到1.5 °C，将增至约4.1次。</Line>
          <Layer id="extremes-heading" {...BOX.heading}>
            <FadeIn><Kicker eyebrow="极端高温 · IPCC" title="十年一遇，不再罕见" size={110} /></FadeIn>
          </Layer>
          <Layer id="extremes-figures" {...BOX.stage}><Extremes /></Layer>
          <Layer id="extremes-source" {...BOX.source}>
            <FadeIn><Source>IPCC 第六次评估报告第一工作组《决策者摘要》图 SPM.6：陆地日最高气温的十年一遇事件，相对 1850–1900 年</Source></FadeIn>
          </Layer>
        </Scene>

        <Scene id="ending" duration={SCENES.ending}>
          <Line id="ending-1">所以，每零点一度都算数。</Line>
          <Layer id="ending-title" x={160} y={260} w={1600} h={340}>
            <FadeIn><Kicker eyebrow="地球变暖了多少？" title="每 0.1 °C 都算数" size={150} /></FadeIn>
          </Layer>
          <Layer id="ending-sources" x={160} y={700} w={1600} h={120}>
            <FadeIn start={0.6}>
              <Source>数据来源：Berkeley Earth 全球陆地+海洋温度记录（Rohde & Hausfather, 2020；2025 年 1 月分析）</Source>
              <Source>IPCC AR6 WG1《决策者摘要》（2021）</Source>
            </FadeIn>
          </Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
