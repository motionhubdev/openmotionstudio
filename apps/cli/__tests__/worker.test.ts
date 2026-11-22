import { describe, expect, it } from 'vitest';
import { renderStages } from '../worker';

describe('renderStages', () => {
  it('draws with a Chrome a core, as memory allows, and at most eight', () => {
    expect(renderStages(4, 16e9)).toBe(4);
    expect(renderStages(16, 64e9)).toBe(8);
    expect(renderStages(8, 4e9)).toBe(2);
  });

  it('always draws with one, however little there is', () => {
    expect(renderStages(1, 0.5e9)).toBe(1);
    expect(renderStages(0, 0)).toBe(1);
  });
});
