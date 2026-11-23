// How often a once-a-decade hot extreme happens, per IPCC AR6 WG1 SPM, Figure SPM.6 (hot temperature extremes over land,
// the daily maximum exceeded once in ten years on average in 1850-1900): 1 time, 2.8 times at +1 °C, 4.1 times at +1.5 °C.
// Three plates side by side at one height; the light walks from one to the next (its stops are in kit.tsx).
import {useTime} from '@motionhub/runtime';
import {Plate} from '../motions/@iamsuosi/stage-light/react/parts/plate.tsx';
import {Numeral} from '../motions/@iamsuosi/stage-light/react/parts/numeral.tsx';
import {out, tween} from './kit.tsx';

const COLUMNS = [
  {title: '工业化前', sub: '1850–1900 年', value: 1, decimals: 0, enter: 0.3, count: [0.3, 0.3], lit: [1.2, 2.6]},
  {title: '升温 1 °C', sub: '约为现在', value: 2.8, decimals: 1, enter: 2.4, count: [2.6, 3.8], lit: [2.6, 5.6]},
  {title: '升温 1.5 °C', sub: '未来情景', value: 4.1, decimals: 1, enter: 5.4, count: [5.8, 7.0], lit: [5.6, 99]},
];

export function Extremes() {
  const t = useTime();
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 460px)', columnGap: 110, justifyContent: 'center', paddingTop: 40}}>
      {COLUMNS.map((c, i) => {
        const shown = tween(t, c.enter, c.enter + 0.3, 0, 1);
        const lit = Math.min(tween(t, c.lit[0]!, c.lit[0]! + 1, 0.2, 1), tween(t, c.lit[1]!, c.lit[1]! + 1, 1, 0.2));
        const value = c.count[0] === c.count[1] ? c.value : tween(t, c.count[0]!, c.count[1]!, 0, c.value, out);
        return (
          <div key={i} style={{opacity: shown}}>
            <Plate title={c.title} sub={c.sub} lit={lit} width={460} />
            <div style={{marginTop: 40, paddingLeft: 36}}>
              <Numeral value={value} decimals={c.decimals} unit="次" label="每十年出现的次数" size={200} lit={lit} accent={i > 0 && lit > 0.6} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
