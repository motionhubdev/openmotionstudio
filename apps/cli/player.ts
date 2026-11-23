// The web player's page (index.html of `oms player`): plays a film in any browser without rendering it. The film is drawn
// in a sandboxed frame: frame.js holds its whole document (the Studio's preview core with the film in it, web.ts), which
// this page writes into the frame (srcdoc), so the frame loads nothing from the host; the core is held still and moved
// by this page (ADR 0018). This page owns the clock, the film's sound as one soundtrack mixed as its MP4's is, and the
// controls, as motionhub's reel player draws them. Built by apps/desktop/scripts/build-cli.mjs into dist/player.js.
//
// The clock is the soundtrack's while it plays (an <audio> reports its time in steps of 10 to 50 ms, so the time
// between steps runs on the page's clock, never past a quarter second, never backwards); without one, or while the
// browser will not play it, the page's. A soundtrack that stalls holds the picture with it; so does an image the frame
// shows before it has loaded, for at most five seconds.

// A module, so its names are its own and not the window's.
export {};

interface Shown {
  seconds: number;
  width: number;
  height: number;
  fps: number;
  title: string;
  /** Whether soundtrack.mp4 is beside the page. */
  sound: boolean;
  /** Served by `oms preview`: the page reloads, at the time it was at, when the film is built again. */
  live: boolean;
}

interface FromFrame {
  type: string;
  t?: number;
  loading?: boolean;
  message?: string;
}

const film = JSON.parse(document.getElementById('oms-film')!.textContent!) as Shown;
const params = new URLSearchParams(location.search);
const frames = Math.max(1, Math.round(film.seconds * film.fps));
const last = (frames - 1) / film.fps;
const SEEK = 5;
const IDLE_MS = 2500;
/** How long the picture waits for an image before it plays on without it. */
const IMAGE_WAIT_MS = 5000;
/** How long buffering lasts before it is shown. */
const SPIN_MS = 200;

const PLAY = 'M8 5l11 7-11 7z';
const PAUSE = 'M7 5h3v14H7zM14 5h3v14h-3z';
const SOUND_ON = 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12';
const SOUND_OFF = 'M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6';
const FULL = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
const SMALL = 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: Node[]): HTMLElementTagNameMap[K] => {
  const node = Object.assign(document.createElement(tag), props) as HTMLElementTagNameMap[K];
  node.append(...children);
  return node;
};
const icon = (d: string, fill = false) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill ? 'currentColor' : 'none');
  path.setAttribute('stroke', fill ? 'none' : 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
};
const setIcon = (button: HTMLButtonElement, d: string, fill = false) => button.replaceChildren(icon(d, fill));

// The page: the frame, scaled to the window; a cover over it that takes the pointer; the controls.
const frame = el('iframe', { title: film.title, tabIndex: -1 });
frame.setAttribute('sandbox', 'allow-scripts');
frame.width = String(film.width);
frame.height = String(film.height);
const stage = el('div', { className: 'frame' }, frame);
stage.style.width = `${film.width}px`;
stage.style.height = `${film.height}px`;
const cover = el('div', { className: 'cover' });
const big = el('button', { type: 'button', className: 'big', ariaLabel: 'Play' });
setIcon(big, PLAY, true);
const chip = el('button', { type: 'button', className: 'chip', hidden: true }, icon(SOUND_OFF), document.createTextNode(' Tap for sound'));
const spinner = el('div', { className: 'spin', hidden: true, ariaLabel: 'Loading' });
const notice = el('div', { className: 'notice', hidden: true, role: 'alert' });
const scrub = el('input', { type: 'range', className: 'scrub', min: '0', max: String(last), step: String(1 / film.fps), value: '0', ariaLabel: 'Time' });
const toggleButton = el('button', { type: 'button' });
const soundButton = el('button', { type: 'button', hidden: !film.sound });
const fullButton = el('button', { type: 'button' });
const time = el('span', { className: 'time' });
const bar = el('div', { className: 'bar' }, scrub, el('div', { className: 'row' }, toggleButton, soundButton, time, el('span', { className: 'gap' }), fullButton));
const shell = el('div', { className: 'shell' }, stage, cover, big, spinner, chip, notice, bar);
document.getElementById('player')!.append(shell);

const audio = film.sound ? new Audio('soundtrack.mp4') : null;
if (audio) {
  audio.preload = 'auto';
  audio.load();
}

let t = 0;
let playing = false;
let ready = false;
let muted = false;
/** The page's clock while there is no soundtrack to keep to: the film's time at `wallAt`. */
let wallFrom = 0;
let wallAt = 0;
/** The soundtrack's last reported time, and when the page saw it change. */
let heard = -1;
let heardAt = 0;
/** Whether the soundtrack keeps the time: it is there and the browser plays it. */
let audioClock = false;
/** Why the picture holds while playing: the soundtrack is buffering, or the frame shows an image still loading. */
let buffering = false;
let imagesSince = 0;
/** Whether the picture gave up waiting for the images loading now: it waits again once none is. */
let gaveUp = false;
let spinTimer = 0;
/** The frame last asked for, and whether the frame has drawn it yet. */
let asked = -1;
let drawing = false;

const fail = (message: string) => {
  notice.textContent = message;
  notice.hidden = false;
  console.error(message);
};

function show(): void {
  const frameNo = Math.min(frames - 1, Math.floor(t * film.fps + 1e-6));
  scrub.value = String(frameNo / film.fps);
  scrub.style.setProperty('--p', `${(frameNo / Math.max(1, frames - 1)) * 100}%`);
  scrub.setAttribute('aria-valuetext', `${clock(t)} of ${clock(film.seconds)}`);
  time.replaceChildren(document.createTextNode(`${clock(t)} `), el('span', { textContent: `/ ${clock(film.seconds)}` }));
  setIcon(toggleButton, playing ? PAUSE : PLAY, true);
  toggleButton.ariaLabel = toggleButton.title = playing ? 'Pause (k)' : 'Play (k)';
  setIcon(soundButton, muted ? SOUND_OFF : SOUND_ON);
  soundButton.ariaLabel = soundButton.title = muted ? 'Sound on (m)' : 'Sound off (m)';
  big.hidden = playing || !ready;
  shell.classList.toggle('playing', playing);
  // One frame at a time: the next is asked for once the frame has drawn the last, so a slow frame never queues more.
  if (ready && !drawing && frameNo !== asked) {
    asked = frameNo;
    drawing = true;
    frame.contentWindow?.postMessage({ type: 'oms:seek', t: frameNo / film.fps }, '*');
  }
}

function setBuffering(value: boolean): void {
  if (value === buffering) return;
  buffering = value;
  clearTimeout(spinTimer);
  if (value) spinTimer = window.setTimeout(() => (spinner.hidden = false), SPIN_MS);
  else spinner.hidden = true;
}

/** The film's time now, on the soundtrack's clock or the page's. */
function now(at: number): number {
  if (!audio || !audioClock) return buffering ? t : wallFrom + (at - wallAt) / 1000;
  const reported = audio.currentTime;
  if (reported !== heard) {
    heard = reported;
    heardAt = at;
  }
  if (audio.paused || audio.readyState < 3) return reported;
  return Math.max(t, Math.min(reported + (at - heardAt) / 1000, reported + 0.25));
}

function tick(at: number): void {
  if (!playing) return;
  // An image the frame waits for holds the picture, and the sound with it, for a while.
  if (imagesSince && at - imagesSince > IMAGE_WAIT_MS) {
    imagesSince = 0;
    gaveUp = true;
    fail('An image in the film did not load within five seconds; the film plays on without it.');
    resumeHeld();
  }
  const next = now(at);
  if (next >= last) {
    t = last;
    if (params.get('loop') === '1') {
      seek(0);
      void play();
    } else pause();
    show();
    return;
  }
  t = next;
  show();
  requestAnimationFrame(tick);
}

/** Starts the soundtrack at the film's time; a browser that refuses sound without a gesture plays it muted, and says so. */
async function startSound(): Promise<void> {
  if (!audio) return;
  audio.currentTime = t;
  audio.muted = muted;
  try {
    await audio.play();
    audioClock = true;
  } catch (error) {
    if ((error as DOMException).name !== 'NotAllowedError') {
      fail(`The film's sound did not play: ${(error as Error).message}`);
      audioClock = false;
      return;
    }
    muted = true;
    audio.muted = true;
    chip.hidden = false;
    try {
      await audio.play();
      audioClock = true;
    } catch {
      audioClock = false;
    }
  }
}

async function play(): Promise<void> {
  if (!ready || playing) return;
  if (t >= last) t = 0;
  playing = true;
  wallFrom = t;
  wallAt = performance.now();
  show();
  await startSound();
  if (!playing) return audio?.pause();
  wallFrom = t;
  wallAt = performance.now();
  requestAnimationFrame(tick);
}

function pause(): void {
  playing = false;
  audio?.pause();
  imagesSince = 0;
  setBuffering(false);
  show();
}

function seek(to: number): void {
  t = Math.max(0, Math.min(last, to));
  wallFrom = t;
  wallAt = performance.now();
  if (audio) audio.currentTime = t;
  heard = -1;
  show();
}

function resumeHeld(): void {
  setBuffering(false);
  if (playing && audioClock && audio?.paused) void audio.play().catch(() => {});
  wallFrom = t;
  wallAt = performance.now();
}

const toggle = () => (playing ? pause() : void play());
const toggleSound = () => {
  chip.hidden = true;
  muted = !muted;
  if (audio) audio.muted = muted;
  // A soundtrack the browser would not start without a gesture starts now, in this one, and keeps the time again.
  if (audio && playing && !muted && audio.paused && !imagesSince) {
    audio.currentTime = t;
    heard = -1;
    audio.play().then(() => (audioClock = true), (error: Error) => fail(`The film's sound did not play: ${error.message}`));
  }
  show();
};
const fullscreen = () => {
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
};

addEventListener('message', (event: MessageEvent<FromFrame>) => {
  if (event.source !== frame.contentWindow) return;
  const message = event.data;
  if (message?.type === 'oms:ready') {
    ready = true;
    setBuffering(false);
    show();
    if (params.get('autoplay') === '1') void play();
  } else if (message?.type === 'oms:error') fail(`The film failed: ${message.message}`);
  else if (message?.type === 'oms:time') {
    drawing = false;
    if (!message.loading) gaveUp = false;
    if (message.loading && playing && !imagesSince && !gaveUp) {
      imagesSince = performance.now();
      setBuffering(true);
      audio?.pause();
    } else if (!message.loading && imagesSince) {
      imagesSince = 0;
      resumeHeld();
    }
    show();
  }
});

if (audio) {
  audio.addEventListener('waiting', () => playing && setBuffering(true));
  audio.addEventListener('playing', () => !imagesSince && setBuffering(false));
  audio.addEventListener('error', () => fail('The film\'s soundtrack (soundtrack.mp4) did not load; it plays without sound.'));
}

// Fitted to the window, kept to its proportions.
const fit = () => (stage.style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / film.width, innerHeight / film.height)})`);
fit();
addEventListener('resize', fit);
document.addEventListener('fullscreenchange', () => {
  const full = !!document.fullscreenElement;
  setIcon(fullButton, full ? SMALL : FULL);
  fullButton.ariaLabel = fullButton.title = full ? 'Exit full screen (f)' : 'Full screen (f)';
});
setIcon(fullButton, FULL);
fullButton.ariaLabel = fullButton.title = 'Full screen (f)';

cover.addEventListener('click', toggle);
cover.addEventListener('dblclick', fullscreen);
big.addEventListener('click', () => void play());
toggleButton.addEventListener('click', toggle);
soundButton.addEventListener('click', toggleSound);
chip.addEventListener('click', toggleSound);
fullButton.addEventListener('click', fullscreen);
scrub.addEventListener('input', () => seek(Number(scrub.value)));

// The controls step aside while the film plays and the pointer rests; any move or key brings them back.
let idleTimer = 0;
const wake = () => {
  shell.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => shell.classList.add('idle'), IDLE_MS);
};
wake();
addEventListener('pointermove', wake);
addEventListener('keydown', (event) => {
  wake();
  if (event.target === scrub && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;
  if (event.key === ' ' || event.key === 'k') {
    event.preventDefault();
    toggle();
  } else if (event.key === 'ArrowLeft') seek(t - SEEK);
  else if (event.key === 'ArrowRight') seek(t + SEEK);
  else if (event.key === 'Home' || event.key === '0') seek(0);
  else if (event.key === 'End') seek(last);
  else if (event.key === 'm' && film.sound) toggleSound();
  else if (event.key === 'f') fullscreen();
});

// `oms preview`: built again, the page comes back at the time it was at.
const resumeAt = Number(/^#t=([\d.]+)$/.exec(location.hash)?.[1]);
if (Number.isFinite(resumeAt)) seek(resumeAt);
if (film.live)
  new EventSource('__built').addEventListener('message', () => {
    location.replace(`${location.pathname}${location.search}#t=${t.toFixed(3)}`);
    location.reload();
  });

// The frame's document, loaded as a script so the page also plays from a file on disk; the spinner shows meanwhile.
setBuffering(true);
const source = el('script', { src: 'frame.js' });
source.addEventListener('load', () => {
  const html = (window as { __omsFrame?: string }).__omsFrame;
  if (typeof html !== 'string') return fail('frame.js holds no film: export the player again.');
  frame.srcdoc = html;
});
source.addEventListener('error', () => fail('The film (frame.js) did not load.'));
document.head.append(source);
show();
