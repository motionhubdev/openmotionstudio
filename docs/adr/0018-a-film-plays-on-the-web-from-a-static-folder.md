# 18. A film plays on the web from a static folder

> **Status:** Accepted · **Date:** 2026-11-23

How a film made with `oms` plays in a browser without being rendered: what the folder holds, which clock the picture
keeps to, and how its media load.

## Decision

`oms player <folder> --out <new folder>` writes a folder that any static web host plays (`apps/cli/web.ts`), and
`oms preview <folder>` serves the same folder on 127.0.0.1, building it again when a project file changes; an open
page then reloads at the time it was at. The folder holds two pages, as the Studio holds the preview frame in its
window:

- **`index.html`, the player** (`apps/cli/player.ts`): the clock, the sound and the controls of motionhub's reel player
  (play, a scrubber, sound, full screen, the same keys, controls that step aside while the film plays). It
  plays nothing of the film's own code.
- **`film.html`, the frame**: the Studio's preview core (`studio/core.js`) held still (`?render=1`), as an export holds
  it, in an `<iframe sandbox="allow-scripts">` under the film's own policy (`filmPolicy`, as a `<meta>`). The player
  moves it frame by frame (`oms:seek`, one frame asked for once the last is drawn) and hears each frame drawn
  (`oms:time`), with whether an image it shows is still loading. Opened on its own (`&framed=1`), it draws nothing.

**The frame fetches nothing.** Its origin is opaque, so its fetches and its faces are CORS requests, which a static host
need not answer. The film's faces, the ones it imports and its motions', are written into its bundle and `fonts.css`
as `data:` URLs; its narration's timing is written into `film.html` (`#oms-voice`, `null` without one), which the core
reads before it would fetch `voice/`. The frame loads only scripts, a stylesheet and images, which a page may load
from any host. The images the bundle imports are asked for as the frame opens (`<link rel="preload">`). The folder holds
the bundle's files and nothing else of the project. The bundle's inline source map is left out.

**The sound is one soundtrack** (`soundtrack.m4a`, AAC), mixed by the export's own mix (`mixSounds`, `mixFinish`,
[ADR 0017](0017-an-export-is-encoded-in-segments-and-mixed-in-blocks.md)) with the person's ffmpeg, so the page sounds
as the MP4 does. **The clock is the soundtrack's**, as VisoTalk's and HyperFrames' players keep to their audio. An
`<audio>` reports its time in steps of 10 to 50 ms, so the player runs the time between steps on the page's clock,
never more than 0.25 s past a step and never backwards. The picture is a whole frame (`floor(t × fps)`), as the MP4's is.
Without a soundtrack, or while the browser will not play one, the page's clock keeps the time.

**Loading holds the picture, for a while.**
- A soundtrack that stalls (`waiting`) holds the picture with it.
- An image the frame shows before it has loaded pauses the soundtrack and the picture, for at most five seconds. After
  that the player says so on the page and plays on, without waiting for the images loading then.
- Either shows a spinner only after 200 ms.

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
frame shown kept within 6 to 41 ms of the soundtrack (one frame at 30 fps), and on a host slower than the soundtrack
the picture held with it.

## Cost

- A face is downloaded as base64, a third larger, inside the bundle: a film in Chinese carries its faces whole (a 2 MB
  subset made the bundle 2.9 MB).
- A sound cannot be muted on its own in the page, and the page cannot play a narration the film has not mixed.
- An image is held for at most five seconds; a film with many large images on a slow host plays on without some.
- The folder trusts its host: `film.html` opened on its own refuses to draw, but a host serving other pages on the same
  origin shares it with the film's code if someone frames `film.html` there with more rights. Put the folder on its own
  origin.
- The core and the bundle are built for current Chrome (`chrome130`); only Chromium was tested. A browser older than
  the bundle's syntax cannot play it.
- `oms preview` builds the whole player again on every change (a few seconds, the soundtrack included), and plays only
  on this machine.
