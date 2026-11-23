import {Film, Layer, Line, MotionScope, Scene, Sound} from '@motionhub/runtime';
import {C, Heading, captionTokens} from './parts/kit';
import {CoverTitle, Harbour} from './parts/cover';
import {FarDiagram, PullDiagram, SunDiagram} from './parts/orbit';
import {SpinningEarth, TideChart} from './parts/spin';
// Noto Serif SC and Noto Sans SC from Google Fonts, cut by oms font (SIL Open Font License 1.1, licences in media/fonts/).
import noto_serif_sc_700 from './media/fonts/noto-serif-sc-700.ttf';
import noto_sans_sc_400 from './media/fonts/noto-sans-sc-400.ttf';
import noto_sans_sc_700 from './media/fonts/noto-sans-sc-700.ttf';

const faces = `
  @font-face { font-family: 'Noto Serif SC'; font-weight: 700; src: url(${noto_serif_sc_700}); }
  @font-face { font-family: 'Noto Sans SC'; font-weight: 400; src: url(${noto_sans_sc_400}); }
  @font-face { font-family: 'Noto Sans SC'; font-weight: 700; src: url(${noto_sans_sc_700}); }
`;

/** The film's size and rate; its scenes decide its length. */
export const film = {width: 1920, height: 1080, fps: 30};

export default function Main() {
  return (
    <MotionScope tokens={captionTokens}>
      <Film voice="minimax:male-qn-jingying" captions="words">
        {/* oms's own effects, 6 dB down under the narration (which oms voice levels to -16 LUFS). */}
        <Sound src="media/effects.wav" volume={-6} />
        <Layer id="ground">
          <style>{faces}</style>
          <div style={{width: '100%', height: '100%', background: `radial-gradient(ellipse at 50% 40%, ${C.deep} 0%, ${C.ground} 70%)`}} />
        </Layer>

        <Scene id="question" duration={5}>
          <Line id="question-line">海水每天涨了又落，潮汐是怎么来的？</Line>
          <Layer id="title" x={120} y={150} w={860} h={600}><CoverTitle /></Layer>
          <Layer id="harbour" x={1000} y={120} w={820} h={760}><Harbour /></Layer>
        </Scene>

        <Scene id="pull" duration={12}>
          <Line id="pull-moon">答案在月球：它的引力拉着地球，越近拉得越强。</Line>
          <Line id="pull-near">朝向月球的一侧拉得最强，海水鼓起，形成一个潮汐隆起。</Line>
          <Layer id="heading" x={120} y={60} w={1680} h={120}><Heading>月球的引力</Heading></Layer>
          <Layer id="earth-moon"><PullDiagram /></Layer>
        </Scene>

        <Scene id="far" duration={6.5}>
          <Line id="far-side">背向月球的一侧拉得最弱，海水落在后面，也鼓了起来。</Line>
          <Layer id="heading" x={120} y={60} w={1680} h={120}><Heading>背面的隆起</Heading></Layer>
          <Layer id="earth-moon"><FarDiagram /></Layer>
        </Scene>

        <Scene id="spin" duration={10}>
          <Line id="spin-turn">地球每天自转一圈，海岸先后经过这两个隆起。</Line>
          <Line id="spin-twice">所以一天大约有两次涨潮、两次落潮。</Line>
          <Layer id="heading" x={120} y={60} w={1680} h={120}><Heading>一天两次涨落</Heading></Layer>
          <Layer id="spinning-earth" x={120} y={230} w={860} h={620}><SpinningEarth /></Layer>
          <Layer id="tide-chart" x={1040} y={230} w={800} h={620}><TideChart /></Layer>
        </Scene>

        <Scene id="sun" duration={11}>
          <Line id="sun-pull">太阳也在拉，只是它的潮汐力不到月球的一半。</Line>
          <Line id="sun-spring">日月地连成一线时，两股力叠加，潮差最大，这就是大潮。</Line>
          <Layer id="heading" x={120} y={60} w={1680} h={120}><Heading>太阳与大潮</Heading></Layer>
          <Layer id="sun-earth-moon"><SunDiagram /></Layer>
        </Scene>
      </Film>
    </MotionScope>
  );
}
