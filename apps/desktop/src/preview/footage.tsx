// The preview core's <Video>: a recorded clip drawn in the film, as @motionhub/runtime's <Video> asks of an engine. The
// film imports the clip, as it does an image, so it travels with the bundle everywhere the film plays (oms's web player
// carries it as a data: URL). Its file is fetched once and played from a blob: URL, so it seeks to any time whatever the
// server it came from: the oms-preview: scheme and oms's own server answer no ranges.
//
// - In a render, a still and oms's web player (the core's Still) it is a picture of the time asked for: the clip is moved
//   to its time and the frame waits until that frame is on the page (footageSettled): decoded (`seeked`) and then shown
//   (requestVideoFrameCallback), or three frames drawn without it when the seek left the frame shown as it was. Where oms
//   draws frames only on demand, it draws them, unphotographed, while it waits (apps/cli/chrome.ts).
// - In the Studio's preview (the core's Player) it plays beside the film's clock, and is put back on it when it drifts.
//
// A clip plays muted: its own sound is not the film's. It is shown from `startAt` seconds of its sequence, its source
// from `trimBefore` seconds at `playbackRate`, and its last frame holds once the source has ended.

import { useTime } from '@motionhub/runtime';
import { type CSSProperties, createContext, useContext, useLayoutEffect, useRef } from 'react';

export interface FootageProps {
  src: string;
  startAt?: number;
  trimBefore?: number;
  playbackRate?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
  style?: CSSProperties;
}

/** How the frame shows time: a still the page is moved to, or the preview playing (or paused) on its own clock. */
export type FootageClock = 'still' | { playing: boolean };
export const FootageClockContext = createContext<FootageClock>('still');

/** How far the picture may drift from the film's clock while playing before the clip is put back on it, in seconds. */
const DRIFT = 0.15;
/**
 * How far past a frame's start a clip is moved, in seconds: a time on a frame's boundary (89 / 30 s) reaches the browser
 * rounded a hair early, where it shows the frame before.
 */
const INTO_FRAME = 0.001;
/** How long a still waits for a clip to show its frame before it is drawn anyway, and said, in milliseconds. */
const SEEK_TIMEOUT = 10000;

/**
 * The time in the clip's source shown at `t` seconds of its sequence: null before `startAt`; from there `trimBefore` on,
 * at `playbackRate`; held just before the end once the source has ended, where a browser still shows its last frame.
 */
export function footageTime(t: number, props: Pick<FootageProps, 'startAt' | 'trimBefore' | 'playbackRate'>, duration?: number): number | null {
  const { startAt = 0, trimBefore = 0, playbackRate = 1 } = props;
  if (t < startAt) return null;
  const at = trimBefore + (t - startAt) * playbackRate;
  return duration !== undefined && Number.isFinite(duration) ? Math.max(0, Math.min(at, duration - 0.001)) : at;
}

/** What a still is waiting for: each clip moving to its frame. */
const pending = new Set<Promise<unknown>>();

/** Resolves once every clip on the page shows the frame of the time last asked for. */
export async function footageSettled(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending]);
}

/** Whether a clip on the page is still moving to its frame. */
export const footageLoading = (): boolean => pending.size > 0;

const sources = new Map<string, Promise<string>>();

/** A URL the clip seeks in: an imported clip's file (`build/…`) fetched once into a blob: URL, or a data: URL as given. */
function playable(src: string): Promise<string> {
  let source = sources.get(src);
  if (!source) {
    source = /^(data|blob):/.test(src)
      ? Promise.resolve(src)
      : /^build\//.test(src)
        ? fetch(src).then(async (response) => {
            if (!response.ok) throw new Error(`<Video>: the clip ${src} did not load (${response.status}).`);
            return URL.createObjectURL(await response.blob());
          })
        : Promise.reject(new Error(`<Video src="${src}">: import the clip and give it that, as an image is given (import clip from './media/clip.mp4'; <Video src={clip} />).`));
    sources.set(src, source);
  }
  return source;
}

/** Clips whose failure was said: once each, not at every frame. */
const said = new Set<string>();
/** Says a clip's failure where the Studio and oms report a film's errors (the core's listeners), once. */
function fail(src: string, error: unknown): void {
  if (said.has(src)) return;
  said.add(src);
  reportError(error);
}

/** Resolves once `video` has data for its current frame, or rejects when it cannot play its file. */
function loaded(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
  return new Promise((done, refuse) => {
    const off = () => {
      video.removeEventListener('loadeddata', ok);
      video.removeEventListener('error', bad);
    };
    const ok = () => (off(), done());
    const bad = () => (off(), refuse(new Error(`<Video>: the browser cannot play this clip (${video.error?.message || `code ${video.error?.code}`}). Use H.264 in MP4, or WebM.`)));
    video.addEventListener('loadeddata', ok);
    video.addEventListener('error', bad);
  });
}

/** The longest a source frame is taken to last, in seconds: a frame shown more than this before a seek's time is not its. */
const LONGEST_FRAME = 0.1;

/**
 * Resolves once the page has shown `video`'s frame: the frame at `time` when given (a frame shown from an earlier time,
 * such as the clip's first, arriving late, is not taken for it), or after three frames drawn with none shown, when the
 * frame there is the one already on the page.
 */
function shown(video: HTMLVideoElement, time?: number): Promise<void> {
  return new Promise((done) => {
    let over = false;
    let frames = 0;
    const end = () => {
      if (over) return;
      over = true;
      done();
    };
    const presented = (_now: number, frame: VideoFrameCallbackMetadata) => {
      if (over) return;
      if (time === undefined || (frame.mediaTime <= time + 0.0005 && frame.mediaTime > time - LONGEST_FRAME)) return end();
      frames = 0;
      video.requestVideoFrameCallback(presented);
    };
    video.requestVideoFrameCallback?.(presented);
    const tick = () => (over ? undefined : ++frames >= 3 ? end() : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  });
}

/** Moves a paused `video` to the frame at `time` and resolves once that frame is on the page. */
function seek(video: HTMLVideoElement, time: number): Promise<void> {
  const target = Math.min(time + INTO_FRAME, video.duration - 0.0005);
  if (Math.abs(video.currentTime - target) < 0.0005 && !video.seeking) return Promise.resolve();
  return new Promise((done) => {
    const timer = setTimeout(() => {
      console.warn(`A clip did not reach ${time.toFixed(3)} s in ${SEEK_TIMEOUT / 1000} s; the frame is drawn as it is.`);
      finish();
    }, SEEK_TIMEOUT);
    const finish = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      done();
    };
    const onSeeked = () => void shown(video, target).then(finish);
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  });
}

/**
 * Puts `video` on `url` and waits until it has a frame. A clip just opened first shows its first frame: that is waited
 * for too, or it would be the frame shown that a seek's wait took for its own.
 */
async function open(video: HTMLVideoElement, url: string): Promise<void> {
  if (video.dataset.url === url) return loaded(video);
  video.dataset.url = url;
  video.src = url;
  await loaded(video);
  await shown(video);
}

export function Footage({ src, startAt = 0, trimBefore = 0, playbackRate = 1, objectFit = 'cover', style }: FootageProps) {
  const t = useTime();
  const clock = useContext(FootageClockContext);
  const visible = t >= startAt;
  const box: CSSProperties = { width: '100%', height: '100%', display: 'block', visibility: visible ? 'visible' : 'hidden', ...style };
  return clock === 'still' ? (
    <StillFootage src={src} t={t} props={{ startAt, trimBefore, playbackRate }} style={{ objectFit, ...box }} />
  ) : (
    <PlayingFootage src={src} t={t} props={{ startAt, trimBefore, playbackRate }} playing={clock.playing} style={{ objectFit, ...box }} />
  );
}

type Timing = Required<Pick<FootageProps, 'startAt' | 'trimBefore' | 'playbackRate'>>;

/** Each clip's last move, so the next starts only once it is done: two at once would each take the other's frame for its own. */
const queues = new WeakMap<HTMLVideoElement, Promise<unknown>>();
const after = (video: HTMLVideoElement, move: () => Promise<void>): Promise<void> => {
  const job = (queues.get(video) ?? Promise.resolve()).catch(() => {}).then(move);
  queues.set(video, job);
  return job;
};

/** A picture of the clip at `t`: the clip held on the frame of that time. */
function StillFootage({ src, t, props, style }: { src: string; t: number; props: Timing; style: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { startAt, trimBefore, playbackRate } = props;
  // After each commit, before the still that asked for it is drawn.
  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    const job = after(video, async () => {
      await open(video, await playable(src));
      const time = footageTime(t, { startAt, trimBefore, playbackRate }, video.duration);
      if (time !== null) await seek(video, time);
    });
    pending.add(job);
    void job.catch((error: unknown) => fail(src, error)).finally(() => pending.delete(job));
  }, [src, t, startAt, trimBefore, playbackRate]);
  return <video ref={ref} muted playsInline preload="auto" style={style} />;
}

/** The clip playing beside the film's clock, put back on it when it drifts; held on its frame while the film is paused. */
function PlayingFootage({ src, t, props, playing, style }: { src: string; t: number; props: Timing; playing: boolean; style: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { startAt, trimBefore, playbackRate } = props;
  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    const job = (async () => {
      await open(video, await playable(src));
      const time = footageTime(t, { startAt, trimBefore, playbackRate }, video.duration);
      if (playing && time !== null && time < video.duration - 0.001) {
        video.playbackRate = playbackRate;
        if (Math.abs(video.currentTime - time) > DRIFT) video.currentTime = time;
        if (video.paused) await video.play().catch(() => {});
        return;
      }
      if (!video.paused) video.pause();
      if (time !== null) await seek(video, time);
    })();
    job.catch((error: unknown) => fail(src, error));
  }, [src, t, startAt, trimBefore, playbackRate, playing]);
  return <video ref={ref} muted playsInline preload="auto" style={style} />;
}
