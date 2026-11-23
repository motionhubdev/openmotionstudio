# 18. A film plays on the web from a static folder

> **Status:** Accepted · **Date:** 2026-11-23

How a film made with `oms` plays in a browser without being rendered: what the folder holds, which clock the picture
keeps to, and how its media load.

## Decision

`oms player <folder> --out <new folder>` writes a folder that any static web host plays (`apps/cli/web.ts`), and
`oms preview <folder>` serves the same folder on 127.0.0.1, building it again when a project file changes; an open
page then reloads at the time it was at. The folder holds four files, and nothing of the project:

- **`index.html` and `player.js`, the player** (`apps/cli/player.ts`): the clock, the sound and the controls of
  motionhub's reel player (play, a scrubber, sound, full screen, the same keys, controls that step aside while the
  film plays). It runs nothing of the film's own code.
- **`frame.js`, the frame's document** (`window.__omsFrame`, a string), which the player writes into an
  `<iframe sandbox="allow-scripts">` (`srcdoc`). It holds the Studio's preview core (`core.js`) and the film's bundle
  as two inline scripts, the motions' faces as a stylesheet and the narration's timing (`#oms-voice`, `null` without
  one). Every file the bundle imports but sounds, faces and images alike, is in the bundle as a `data:` URL; its inline
  source map is left out. The core runs the bundle (`window.__omsInline`) and is a still, as an export holds it. The
  player moves it frame by frame (`oms:seek`, one frame asked for once the last is drawn) and hears each frame drawn
  (`oms:time`), with whether an image it shows is still decoding.
- **`soundtrack.mp4`**, below.

**The frame loads nothing.** Its origin is opaque, so a file it asked the host for would be a cross-origin request, which
a static host need not answer and an artifact host refuses. Its policy allows its two scripts by their hashes, inline
styles and `data:` and `blob:` media, and nothing else (no `'self'`, no `connect-src`). The player's policy names the
same two hashes, since a `srcdoc` frame keeps its parent's policy as well as its own. `frame.js` is a script, not a
page, so the folder also plays opened from disk, and a host that adds its own scripts to the pages it serves cannot add
them to the frame.

**The sound is one soundtrack** (`soundtrack.mp4`: AAC in an MP4, named `.mp4` because hosts serve that type where many do not serve `.m4a`), mixed by the export's own mix (`mixSounds`, `mixFinish`,
[ADR 0017](0017-an-export-is-encoded-in-segments-and-mixed-in-blocks.md)) with the person's ffmpeg, so the page sounds
as the MP4 does. **The clock is the soundtrack's**, as VisoTalk's and HyperFrames' players keep to their audio. An
`<audio>` reports its time in steps of 10 to 50 ms, so the player runs the time between steps on the page's clock,
never more than 0.25 s past a step and never backwards. The picture is a whole frame (`floor(t × fps)`), as the MP4's is.
Without a soundtrack, or while the browser will not play one, the page's clock keeps the time.

**Loading holds the picture, for a while.**
- A soundtrack that stalls (`waiting`) holds the picture with it.
- An image the frame shows before it has decoded pauses the soundtrack and the picture, for at most five seconds. After
  that the player says so on the page and plays on, without waiting for the images loading then.
- Either shows a spinner only after 200 ms, as does `frame.js` while it downloads.

**A browser that refuses sound** without a gesture is handled in three steps:
- The soundtrack is played muted, which browsers allow.
- If the browser refuses even that, the page's clock keeps the time.
- "Tap for sound" starts the sound, in that tap, at the picture's time, and the soundtrack keeps the time again.

`?autoplay=1` starts at once and `?loop=1` loops.

## Reason

Remotion's player runs a film's code in the host page's own React and is under a licence an Apache-2.0 product cannot
take code from. HyperFrames' player frames its film without isolation by default, fetches its runtime from a CDN and
keeps many media elements in step by steering their rates. VisoTalk's player keeps to one mixed soundtrack and holds for
loading within bounds. A film here has no media elements to keep in step: its sounds are mixed, and its picture is a
function of time, so one soundtrack as the clock removes drift between sounds altogether. The Studio's preview core
draws the frame, so the web, the Studio and the MP4 draw the film with one engine
([ADR 0005](0005-the-studio-has-one-engine-its-own.md)), and the frame keeps the isolation of
[ADR 0004](0004-a-films-code-runs-in-a-sandboxed-frame-on-its-own-scheme.md) on any host. Measured in Chromium, the
frame shown kept within 1 to 48 ms behind the soundtrack (a frame and a half at 30 fps, the picture showing whole
frames), and on a host slower than the soundtrack the picture held with it. The same folder played on a plain static
server, in an artifact's viewer, which refuses a sandboxed frame's requests, and opened from disk.

## Cost

- Faces and images are downloaded as base64, a third larger, all in `frame.js` before the first frame: a film in
  Chinese carries its faces whole (a 2 MB subset made `frame.js` 3.1 MB), and a film of many large photographs waits for
  all of them.
- A sound cannot be muted on its own in the page, and the page cannot play a narration the film has not mixed.
- The player's own page runs on the host's origin; only the film's code is kept apart, in the frame.
- The core and the bundle are built for current Chrome (`chrome130`); only Chromium was tested. A browser older than
  the bundle's syntax cannot play it.
- `oms preview` builds the whole player again on every change (a few seconds, the soundtrack included), and plays only
  on this machine.
