// The preview core's <Video>: a recorded clip drawn in the film, as @motionhub/runtime's <Video> asks of an engine. The
// film imports the clip, as it does an image, so it travels with the bundle everywhere the film plays (oms's web player
// carries it as a data: URL). Its file is fetched once and played from a blob: URL, so it seeks to any time whatever the
// server it came from: the oms-preview: scheme and oms's own server answer no ranges.
//
// - In a render, a still and oms's web player (the core's Still) it is a picture of the time asked for: the clip is moved
//   to its time and the frame waits until that frame is decoded (`seeked`) and painted into a canvas (footageSettled).
//   Where oms drives Chrome's frames, it draws them, unphotographed, while a clip waits (apps/cli/chrome.ts).
// - In the Studio's preview (the core's Player) it plays beside the film's clock, and is put back on it when it drifts.
//
// Each page the film plays in holds the whole of each clip in memory (the web player carries it in its page, as base64),
// so a clip is cut to the seconds the film needs. A clip plays muted: its own sound is not the film's. It is shown from `startAt` seconds of its sequence, its source
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
/** How long a clip may take to load, and to reach a frame, before the film fails with it, in milliseconds. */
const LOAD_TIMEOUT = 30000;
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

/** Makes a still wait for `job`, until it has settled either way. */
export function waitFor(job: Promise<unknown>): void {
  pending.add(job);
  void job.catch(() => {}).finally(() => pending.delete(job));
}

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

/**
 * Resolves once `video` has data for its current frame; rejects at once when it cannot play its file, or after
 * LOAD_TIMEOUT. It listens for any of the events that say data has come, since a second wait on the same load hears
 * none of the first ones again.
 */
export function loaded(video: HTMLVideoElement): Promise<void> {
  const cannot = () => new Error(`<Video>: the browser cannot play this clip (${video.error?.message || `code ${video.error?.code}`}). Use H.264 in MP4, or WebM.`);
  if (video.error) return Promise.reject(cannot());
  if (video.readyState >= 2 /* HAVE_CURRENT_DATA */) return Promise.resolve();
  return new Promise((done, refuse) => {
    const ready = ['loadeddata', 'canplay', 'seeked'];
    const off = () => {
      clearTimeout(timer);
      for (const name of ready) video.removeEventListener(name, ok);
      video.removeEventListener('error', bad);
    };
    const ok = () => (off(), done());
    const bad = () => (off(), refuse(cannot()));
    const timer = setTimeout(() => (off(), refuse(new Error(`<Video>: a clip did not load in ${LOAD_TIMEOUT / 1000} s.`))), LOAD_TIMEOUT);
    for (const name of ready) video.addEventListener(name, ok);
    video.addEventListener('error', bad);
  });
}

/** Where a seek to `time` moves `video`: INTO_FRAME into its frame, and just inside the clip's end. */
const seekTarget = (video: HTMLVideoElement, time: number): number => Math.min(time + INTO_FRAME, video.duration - 0.0005);

/**
 * Moves a paused `video` to the frame at `time` and resolves once that frame is decoded (`seeked`); rejects after
 * SEEK_TIMEOUT, so the film fails with it rather than show the frame before.
 */
export function seek(video: HTMLVideoElement, time: number): Promise<void> {
  const target = seekTarget(video, time);
  if (Math.abs(video.currentTime - target) < 0.0005 && !video.seeking) return Promise.resolve();
  return new Promise((done, refuse) => {
    const timer = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      refuse(new Error(`<Video>: a clip did not reach ${time.toFixed(3)} s in ${SEEK_TIMEOUT / 1000} s.`));
    }, SEEK_TIMEOUT);
    const onSeeked = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      done();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  });
}

/** The longest a source frame is taken to last, in seconds: a frame from more than this before a seek's time is not its. */
const LONGEST_FRAME = 0.1;
/** How long a frame that does not look like a seek's is waited on before it is taken anyway, in milliseconds. */
const SAME_FRAME = 250;
/** Clips that have painted a frame since they were opened. */
const painted = new WeakSet<HTMLVideoElement>();

/**
 * Paints into `picture` the frame `video` was moved to at `target`. Just after `seeked`, the frame a video hands a canvas
 * can still be the one it showed before: a clip just opened hands its first frame for a while. So each frame's own time
 * is checked. A clip's first picture is taken once its frame has changed from the one it opened on (`opening`); later
 * ones once the frame lies just before `target`. A frame that never looks right is taken after SAME_FRAME: the clip's
 * own first frame asked for, or a long frame of a screen recording holding a still screen. Without WebCodecs the video
 * is painted as it is.
 */
async function paint(video: HTMLVideoElement, picture: HTMLCanvasElement, target: number, opening: number | null): Promise<void> {
  const draw = (image: CanvasImageSource) => {
    if (picture.width !== video.videoWidth || picture.height !== video.videoHeight) {
      picture.width = video.videoWidth;
      picture.height = video.videoHeight;
    }
    picture.getContext('2d')?.drawImage(image, 0, 0, picture.width, picture.height);
  };
  if (typeof VideoFrame === 'undefined') return draw(video);
  const start = performance.now();
  for (;;) {
    const frame = frameOf(video);
    const at = frame ? frame.timestamp / 1e6 : Number.NaN;
    const waited = performance.now() - start;
    const looks = opening === null ? at > target - LONGEST_FRAME : at !== opening;
    if (frame && at <= target + 0.0005 && (looks || waited >= SAME_FRAME)) {
      draw(frame);
      frame.close();
      painted.add(video);
      return;
    }
    frame?.close();
    if (waited >= SEEK_TIMEOUT) throw new Error(`<Video>: a clip did not show its frame at ${target.toFixed(3)} s in ${SEEK_TIMEOUT / 1000} s.`);
    await new Promise((done) => setTimeout(done, 4));
  }
}

/** The frame `video` hands a canvas now, or null while it has none to hand (it throws InvalidStateError then). */
function frameOf(video: HTMLVideoElement): VideoFrame | null {
  try {
    return new VideoFrame(video);
  } catch {
    return null;
  }
}

/**
 * The time of the frame a clip opened on, while it has painted none; null after, where the browser does not say, or
 * while it has no frame to say it of (its picture is then checked by its time alone).
 */
function openingFrame(video: HTMLVideoElement): number | null {
  if (painted.has(video) || typeof VideoFrame === 'undefined') return null;
  const frame = frameOf(video);
  if (!frame) return null;
  const at = frame.timestamp / 1e6;
  frame.close();
  return at;
}

/** Puts `video` on `url` and waits until it has a frame. */
async function open(video: HTMLVideoElement, url: string): Promise<void> {
  if (video.dataset.url !== url) {
    video.dataset.url = url;
    video.src = url;
  }
  await loaded(video);
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

/**
 * Each clip's last move, so the next starts only once it is done: two at once would each take the other's frame for
 * its own, and a clip that is slow to load would gather a wait at every frame.
 */
const queues = new WeakMap<HTMLVideoElement, Promise<unknown>>();
const after = (video: HTMLVideoElement, move: () => Promise<void>): Promise<void> => {
  const job = (queues.get(video) ?? Promise.resolve()).catch(() => {}).then(move);
  queues.set(video, job);
  return job;
};

/**
 * A picture of the clip at `t`: the clip's frame of that time, painted into a canvas. A <video> is drawn by the
 * compositor from the frame it was last handed, which a screenshot can catch a frame late (Chrome drawing on demand,
 * not driven, shows the frame before a seek about one time in four); a canvas is painted with the page, so the frame
 * photographed is the one decoded.
 */
function StillFootage({ src, t, props, style }: { src: string; t: number; props: Timing; style: CSSProperties }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { startAt, trimBefore, playbackRate } = props;
  // After each commit, before the still that asked for it is drawn.
  useLayoutEffect(() => {
    const clip = video.current;
    const picture = canvas.current;
    if (!clip || !picture) return;
    const job = after(clip, async () => {
      await open(clip, await playable(src));
      const time = footageTime(t, { startAt, trimBefore, playbackRate }, clip.duration);
      if (time === null) return;
      const opening = openingFrame(clip);
      await seek(clip, time);
      await paint(clip, picture, seekTarget(clip, time), opening);
    });
    waitFor(job);
    job.catch((error: unknown) => fail(src, error));
  }, [src, t, startAt, trimBefore, playbackRate]);
  return (
    <>
      <video ref={video} muted playsInline preload="auto" style={{ display: 'none' }} />
      <canvas ref={canvas} style={style} />
    </>
  );
}

/**
 * The clip playing beside the film's clock, put back on it when it drifts; held on its frame while the film is paused.
 * Each move is for the newest `t`: one queued behind a slow load or seek is skipped once a newer one is queued, so it
 * never pulls the clip back to a time already past, and a pause or a scrub waits behind none of them. A seek that is
 * slow while scrubbing is left to the next move rather than fail the film: only a still must have its frame.
 */
function PlayingFootage({ src, t, props, playing, style }: { src: string; t: number; props: Timing; playing: boolean; style: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  const newest = useRef(0);
  const { startAt, trimBefore, playbackRate } = props;
  useLayoutEffect(() => {
    const video = ref.current;
    if (!video) return;
    const move = ++newest.current;
    const job = after(video, async () => {
      if (move !== newest.current) return;
      await open(video, await playable(src));
      if (move !== newest.current) return;
      const time = footageTime(t, { startAt, trimBefore, playbackRate }, video.duration);
      if (playing && time !== null && time < video.duration - 0.001) {
        video.playbackRate = playbackRate;
        if (Math.abs(video.currentTime - time) > DRIFT) video.currentTime = time;
        // Not awaited: the queue would hold every later move until playback starts. A refused play() leaves the clip
        // paused on its frame, and the next move tries again.
        if (video.paused) void video.play().catch(() => {});
        return;
      }
      if (!video.paused) video.pause();
      if (time !== null) await seek(video, time).catch(() => {});
    });
    job.catch((error: unknown) => fail(src, error));
  }, [src, t, startAt, trimBefore, playbackRate, playing]);
  return <video ref={ref} muted playsInline preload="auto" style={style} />;
}
