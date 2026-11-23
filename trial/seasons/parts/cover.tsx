import {useTime, Easing} from '@motionhub/runtime';
import {C, ramp} from './kit';
import {Orbit, Tag, onOrbit} from './orbit';

/**
 * The cover and the common guess. At t = 0 the true orbit, the sun and the Earth are there (the thumbnail).
 * From 2.4 s, with the line "many think summer is when the Earth is nearer", the orbit stretches into the long one
 * people imagine and the Earth slides to its end beside the sun: "summer?" there, "winter?" at the far end.
 */
export function Cover() {
  const t = useTime();
  const stretch = ramp(t, 2.4, 3.6);
  const slide = ramp(t, 2.6, 4.0, Easing.inOutSine);
  const earth = -2.3 + slide * 2.3;
  const near = onOrbit(stretch, 0);
  const far = onOrbit(stretch, Math.PI);
  const nearTag = ramp(t, 3.7, 4.2, Easing.outCubic);
  const farTag = ramp(t, 4.2, 4.7, Easing.outCubic);
  const imagined = ramp(t, 3.2, 3.7, Easing.outCubic);
  return (
    <Orbit myth={stretch} earth={earth}>
      <Tag x={840} y={190} color={C.dim} opacity={imagined}>想象中的轨道</Tag>
      <Tag x={near.x - 30} y={near.y - 110} color={C.warm} opacity={nearTag}>夏天？</Tag>
      <Tag x={far.x + 40} y={far.y - 80} color={C.cold} opacity={farTag}>冬天？</Tag>
    </Orbit>
  );
}
