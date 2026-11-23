// The cover: the question, and one big Moon whose lit face fills and thins, as it does from night to night.
import {interpolate, useTime} from '@motionhub/runtime';
import {ease} from './kit.tsx';
import {PhaseMoon} from './bodies.tsx';

export function CoverMoon() {
  const t = useTime();
  const phase = t < 2.8 ? interpolate(t, [0.9, 2.6], [52, 180], ease) : interpolate(t, [2.8, 4.4], [180, 308], ease);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <g transform="translate(1290 520)"><PhaseMoon r={330} phase={phase} /></g>
    </svg>
  );
}
