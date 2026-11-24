import { afterEach, describe, expect, it, vi } from 'vitest';
import { footageLoading, footageSettled, footageTime, loaded, seek, waitFor } from '../footage';

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

/** A <video> as far as loading and seeking it goes: its state, and the events it fires. */
const clip = (state: { readyState?: number; error?: { code: number; message: string } | null; currentTime?: number; duration?: number } = {}) =>
  Object.assign(new EventTarget(), { readyState: 0, error: null, currentTime: 0, duration: 4, seeking: false, ...state }) as unknown as HTMLVideoElement;

describe('a clip loading and seeking', () => {
  afterEach(() => vi.useRealTimers());

  it('fails at once on a clip the browser could not play, rather than wait for an event that will not come', async () => {
    await expect(loaded(clip({ error: { code: 4, message: 'unsupported' } }))).rejects.toThrow(/cannot play this clip \(unsupported\)/);
  });

  it('takes any event that says the data has come, so a second wait on the same load is not left waiting', async () => {
    for (const event of ['loadeddata', 'canplay', 'seeked']) {
      const video = clip();
      const waiting = loaded(video);
      video.dispatchEvent(new Event(event));
      await expect(waiting).resolves.toBeUndefined();
    }
  });

  it('gives up on a clip that never loads, with an error the film fails with', async () => {
    vi.useFakeTimers();
    const waiting = expect(loaded(clip())).rejects.toThrow(/did not load in 30 s/);
    await vi.advanceTimersByTimeAsync(30000);
    await waiting;
  });

  it('fails a seek that never arrives, rather than let the frame before be photographed', async () => {
    vi.useFakeTimers();
    const waiting = expect(seek(clip({ readyState: 4 }), 2.5)).rejects.toThrow(/did not reach 2.500 s in 10 s/);
    await vi.advanceTimersByTimeAsync(10000);
    await waiting;
  });

  it('moves a frame on a boundary a millisecond into it, and holds the end just inside it', () => {
    const video = clip({ readyState: 4 });
    void seek(video, 89 / 30).catch(() => {});
    expect(video.currentTime).toBeCloseTo(89 / 30 + 0.001, 9);
    void seek(video, 4).catch(() => {});
    expect(video.currentTime).toBeCloseTo(3.9995, 9);
  });
});

describe('what a still waits for', () => {
  it('stops waiting for a clip that failed, so the frame is drawn and the failure said', async () => {
    let fail = (_: Error) => {};
    waitFor(new Promise((_, reject) => (fail = reject)));
    expect(footageLoading()).toBe(true);
    const settled = footageSettled();
    fail(new Error('the clip did not load'));
    await settled;
    expect(footageLoading()).toBe(false);
  });
});
