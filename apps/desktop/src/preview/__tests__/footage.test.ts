import { describe, expect, it } from 'vitest';
import { footageTime } from '../footage';

describe('footageTime', () => {
  it('shows nothing before startAt, then the source from trimBefore at playbackRate', () => {
    const props = { startAt: 2, trimBefore: 5, playbackRate: 1.5 };
    expect(footageTime(1.999, props)).toBeNull();
    expect(footageTime(2, props)).toBe(5);
    expect(footageTime(4, props)).toBe(8);
  });

  it('plays from the start of its sequence when given nothing', () => {
    expect(footageTime(0, {})).toBe(0);
    expect(footageTime(3.25, {})).toBe(3.25);
  });

  it('holds the last frame once the source has ended, just before its end', () => {
    expect(footageTime(9, {}, 6)).toBeCloseTo(5.999, 6);
    expect(footageTime(5.5, {}, 6)).toBe(5.5);
  });

  it('ignores a length the browser does not know yet', () => {
    expect(footageTime(9, {}, Number.NaN)).toBe(9);
    expect(footageTime(9, {}, Number.POSITIVE_INFINITY)).toBe(9);
  });
});
