# 16. Terminal agents author films through the OMS command

> **Status:** Accepted · **Date:** 2026-11-22

Whether, and how, Claude Code or Codex in the person's own terminal, or on a server, can make a finished film, in the format the Studio opens.

## Decision

A second package, `apps/cli` (`@motionhub/oms`), holds the `oms` command and a skill for Claude Code and Codex. It makes a
film end to end, as Remotion's or HyperFrames' command line does; opening it in the Studio is optional. `oms install <claude|codex>`
copies the skill and the film format (the film section of `film.md`) into the host's user skills directory
(`CLAUDE_CONFIG_DIR` or `~/.claude`, `CODEX_HOME` or `~/.codex`) and refuses to replace one already there. `oms init`
writes the Studio's starter `film.tsx` into an empty or new folder; `oms check` and `oms still` build the film and draw
it; `oms render` exports it as an MP4, and `oms player` as a folder a browser plays
([ADR 0018](0018-a-film-plays-on-the-web-from-a-static-folder.md)). `oms motion search` and `oms motion use` find a motion on motionhub and take it
into the project when a film asks for one, as the Studio's `search_motions` and `use_motion` do (`motions.ts`, through
`@motionhub/cli`): `oms` ships no motions of its own. `oms sound` renders the project's motion's sound
(`react/sound.json`) for cues the agent lists (`at:role`, refusing a role that sound lacks) into a WAV the film's
length, with its levels, with `@motionhub/runtime/sound`, the synth that gives a motion's reel its sound on motionhub.dev
(`film/effects.ts`). `oms font` takes a face from Google Fonts cut to the characters the project's sources write
(its `text=` subset), into `media/fonts/` with its licence: the font's copyright and, for the SIL Open Font License,
that licence's text, which the package carries (`apps/cli/font.ts`). `oms voice` speaks the film's lines in its `<Film voice>` into `voice/` as the Studio's Voice the film does
(`narration.ts`, [ADR 0011](0011-narration-is-synthesized-per-line-and-times-the-captions.md)), through the same
providers ([ADR 0012](0012-a-narration-speaks-through-the-persons-own-voice-provider.md)); `oms voice --list` gives a
provider's voices, and `oms voice --recording <file>` takes the narration from the person's own take of the lines instead
(`recording.ts`: transcribed with word times, matched to the lines, cut a clip a line). Their keys are not the Studio's, which only the Studio can open: `oms` reads a key from the
environment it runs in (`MINIMAX_API_KEY`, `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `AZURE_SPEECH_KEY`, with each
provider's settings beside it) at the moment of a call, and never writes, prints or passes it on.

`check`, `still` and `render` run the Studio's own build, review, sound lookup and export, not a copy: `apps/desktop/scripts/build-cli.mjs`
bundles `apps/cli/worker.ts` against `film.ts` (`buildFilmOnce`, the Studio's esbuild options and reporter), `serve.ts`,
`review.ts`, `mix.ts` and `capture.ts` (`exportFrames`), with the preview core from the same build. The film is drawn in **chrome-headless-shell**,
not in Electron (`apps/cli/chrome.ts`):

- **Which Chrome**: the build HyperFrames pins (158.0.8127.36; 150.0.7871.124 on macOS 12 and older, which Chrome
  left after 150), so either tool can use the other's download. `oms` takes
  `OMS_CHROME` when it is set; otherwise that build from HyperFrames' cache (`~/.cache/hyperframes/chrome`, or
  `HYPERFRAMES_CACHE_DIR`) or Puppeteer's shared cache (`~/.cache/puppeteer`); otherwise it downloads it once into
  Puppeteer's cache with `@puppeteer/browsers`, under a lock. A Chrome found on disk is used only when its files hash
  to one of that build's digests, computed as HyperFrames computes them, so a changed or other build is never run.
  Linux on Arm has no headless shell: there `oms` uses the system's Chromium (`/usr/bin/chromium` and the like), only
  when root owns it and no one else can change it, and says how to install one when there is none; it does not run the
  package manager itself, as HyperFrames does.
- **How it is driven**: over the DevTools protocol on a pipe, with its own temporary profile. The page is served by
  request interception from the same files and under the same policy as the Studio's `oms-preview:` scheme
  (`serve.ts`, [ADR 0004](0004-a-films-code-runs-in-a-sandboxed-frame-on-its-own-scheme.md)); every other request is
  refused, names do not resolve and anything else goes to a proxy that is not there; a window the film opens is
  closed. On Linux the headless shell is driven, as HyperFrames and VisoTalk drive it (`--deterministic-mode`): its
  compositor draws a frame only when `HeadlessExperimental.beginFrame` asks, and gives the frame back with it, so a
  frame is never waited for nor ever an earlier one; it is warmed up with one frame of the film before the first is
  taken. Elsewhere, or where driving fails to start, frames are taken with `Page.captureScreenshot`, as the Studio's
  stage takes them. Both draw the same pixels.
- **A render draws with several Chromes at once**, one a core as memory allows (about 1.5 GB each, at most eight), each
  drawing every n-th frame into the Studio's own ordered writer (`exportFrames`'s `stages`). Each Chrome rasters every
  frame whole (`--disable-partial-raster`): rastering only what changed left a frame's pixels depending on the frame
  drawn before it, so the same film rendered by one Chrome and by four would differ. With it they are the same, frame
  for frame.
- **The sandbox**, as HyperFrames decides it: on, except on Linux as root, in a container, on a serverless or
  orchestrated host, or where unprivileged user namespaces are off, where Chrome's sandbox cannot start; a sandbox that
  fails to start is retried without it. Without it `oms` warns once, and the film keeps its page's policy and the
  interception but not the operating system's isolation. `OMS_CHROME_SANDBOX=1` requires the sandbox, `=0` turns it off.

**ffmpeg is the person's**, as HyperFrames and VisoTalk use it: `OMS_FFMPEG`, else the first on the `PATH`
(`apps/cli/ffmpeg.ts`). Before a frame is drawn, `render` checks that it has every encoder, decoder and filter the
Studio's export uses (libx264, AAC, mov_text, PNG, and the mix's filters) and otherwise says how to install a full
build. The Studio keeps shipping its own (`ffmpeg-static`).

`oms` writes nothing into the project: a Studio watching the same folder keeps its bundle. `still` and `render` write
only new files (a PNG; an MP4 and its SubRip beside it) and never overwrite one. The package depends on
`@motionhub/cli`, `@puppeteer/browsers`, esbuild and three.js. It is built with
`npm pack`; publishing it, on npm or with a release, is a separate decision.

## Reason

People who already work in Claude Code or Codex want a film from where they are, often on a server without a display,
then the Studio to refine and export it. A headless shell needs no display and starts as root where a person's
server runs as root, and a pinned build shared with HyperFrames often costs no download at all. The Studio keeps
Electron ([ADR 0005](0005-the-studio-has-one-engine-its-own.md)): its preview and its export stay one engine. Measured
on Linux in software rendering, `oms still` and the Electron stage drew the same pixels for a plain, a blurred and a
three.js film (at most one level apart in 0.001% of the pixels of the blurred one).

## Cost

- A render's encoding is the person's ffmpeg's: its x264 may not be the Studio's, so an MP4 from `oms` can differ in
  bits, not in picture, from one the Studio exports; an ffmpeg without x264 (as some distributions ship) cannot render.
- Two Chromiums draw a film: the Studio's Electron (Chrome 156) and the pinned shell (Chrome 158). They agreed where
  measured; on a GPU, or another platform, a frame from `oms` may differ slightly from the Studio's export.
- The pin follows HyperFrames' release: moving it means its new build's digests, or `oms` downloads its own copy.
- On Linux on Arm the Chromium is the distribution's, of any version: its frames may differ more from the Studio's.
- `oms` runs a browser it did not ship when another tool downloaded it, trusted only by its digests.
- The worker reaches into `apps/desktop/src/main/film/`, so a change there can break the CLI: `worker.ts` and
  `chrome.ts` are in the desktop's typecheck, but `scripts/test-installed.mjs` runs by hand against an installed tarball.
- A tarball pins the Studio it was packed from; a project made with an older one may need the Studio's format.
- A terminal agent's writes are not the Studio's agent's: they get no checkpoints ([ADR 0007](0007-local-checkpoints-track-agent-source-writes.md)).
