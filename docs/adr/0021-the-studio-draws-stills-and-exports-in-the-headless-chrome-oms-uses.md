# 21. The Studio draws stills and exports in the headless Chrome oms uses

> **Status:** Accepted, amends [0004](0004-a-films-code-runs-in-a-sandboxed-frame-on-its-own-scheme.md) and [0014](0014-project-sessions-outlive-editor-windows.md), amended by [0022](0022-a-film-is-drawn-on-the-gpu-where-it-can-be.md) (on the GPU where it can be; the same frames per path) · **Date:** 2026-11-23

Where the Studio draws a film still: for the agent's `check` and `still`, the timeline's scene frames, marks' stills and
the MP4 export.

## Decision

- **One renderer for the Studio and oms**: chrome-headless-shell at the build oms pins (`chromeBuild` in
  `src/main/film/chrome.ts`, moved there from `apps/cli/` so both build from it), driven over the DevTools protocol on a
  pipe, its page served by request interception from the same files and under the same policy as the `oms-preview:`
  scheme (`serve.ts`, ADR 0004). The Studio's offscreen Electron windows, and the render session each project kept for
  them (ADR 0014), are gone.
- **The installer carries it**: `pnpm package` runs `scripts/fetch-chrome.mjs`, which downloads the pinned build for the
  platform and CPU being packaged into `resources/chrome/<build>/`, checks it against the build's digests, and
  electron-builder ships it unpacked beside the app's archive. CI starts the packaged Chrome before a release.
- **Where the installer carries none** the Studio finds one as oms does (`studioChrome`): in development, from
  HyperFrames' or Puppeteer's cache or downloaded once into Puppeteer's; on macOS 12, whose older build is not shipped,
  the same; on Linux on Arm, for which Chrome publishes no headless build, the system's Chromium. `OMS_CHROME` names
  another for both.
- **An export draws with several Chromes at once**, one a core as memory allows (`renderStages`), each every n-th frame,
  as `oms render` does ([ADR 0017](0017-an-export-is-encoded-in-segments-and-mixed-in-blocks.md)).
- Each stage has a temporary profile of its own, removed when it closes. A mark's still outlines its box in the page
  (`window.__omsMark`) before the frame is taken, as the offscreen window did.

## Reason

The Studio's offscreen windows drew a three.js film at about 1.4 frames a second, and adding windows barely helped: their
GPU work shares the app's one GPU process, and every frame is read back from it. oms's headless Chrome, one process each,
drew the same film four to nine times faster. Drawn in the same Chrome, the Studio's export of a 30-second three.js film took 75 s against 681 s, and
matches `oms render` bit for bit; a still the agent looks at in the Studio is the frame oms would render. A hidden,
not offscreen, window was tried and gives DevTools no screenshot.

## Cost

- The installers grow by the Chrome they carry: about 285 MB unpacked, about 100 MB compressed.
- A third-party browser runs beside the app: it must be signed with it on macOS and Windows, and its build is moved
  forward with oms's, not with Electron's.
- macOS 12 and Linux on Arm download or need a Chrome the installer does not carry; a machine with neither cannot
  export until it has one, and the Studio says how.
