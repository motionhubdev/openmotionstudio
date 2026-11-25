# 22. A film is drawn on the GPU where it can be

> **Status:** Accepted, amends [0021](0021-the-studio-draws-stills-and-exports-in-the-headless-chrome-oms-uses.md) · **Date:** 2026-11-24

Where the headless Chrome that draws the Studio's stills and exports, and `oms render` and `oms still`, draws a film's
WebGL: on the machine's GPU or on the CPU.

## Decision

- **The GPU by default, found once.** The first stage a process opens with a Chrome asks that Chrome, started with the
  GPU flags (ANGLE on Direct3D 11 on Windows, Metal on macOS, Vulkan on Linux), for a blank page's WebGL renderer
  (`WEBGL_debug_renderer_info`). A context on hardware means the GPU. No context, or a software renderer (SwiftShader,
  llvmpipe, Microsoft's Basic Render Driver), means SwiftShader on the CPU, as before. A GPU that Chrome blocklists falls
  back by itself and so reads as software. (`drawPath` in `src/main/film/chrome.ts`.)
- **One path per process.** The answer is kept for the process, and every stage it opens with that Chrome draws on it,
  so the frames of one export never mix the two paths. It is not kept on disk: the probe takes about a second, and a
  driver can change between runs.
- **`OMS_RENDER_GPU` overrides it.** `0` draws on the CPU without asking, and `1` draws on the GPU even where Chrome
  blocklists it (`--ignore-gpu-blocklist`, as the trial did).
- **The path is said.** The Studio's export notice says "drawn on the GPU (…)" or "drawn on the CPU (SwiftShader)" with
  WebGL's name for the renderer, and logs it (`film.exported`). `oms render` says the same on stderr. `oms render` keeps
  its resumable segments under the Chrome and the path that drew them.
- **The same frames, per path.** A frame is a function of its time on one path: however many stages draw it, on one
  machine, in the Studio or in `oms`, the frames are the same (3,128 of 3,135 frames were bit-identical between the
  Studio's and `oms`'s GPU renders below). Across paths they are not: the GPU's pixels differ slightly from
  SwiftShader's, and from another GPU's or driver's. What ADR 0021 said of frames ("matches `oms render` bit for bit")
  now holds per path, not across machines.

## Reason

SwiftShader draws a three.js film on the CPU slowly. On a Windows laptop with Intel Arc graphics, the UTMB example
(3,135 frames) exported from the Studio in about 25 minutes on SwiftShader, and in 1 min 53 s with the GPU trial
(`OMS_RENDER_GPU=1`). `oms render` on the GPU took 4 min 41 s from a cold start. Against SwiftShader the GPU's frames
average 46.9 dB PSNR (worst 38.2 dB): the same to the eye, not to the bit. Asking a person to know about an environment
variable to get the faster path, on a machine that has a GPU, left most exports on the slow one.

## Cost

- An export's pixels depend on the machine's GPU and driver: two machines, or one after a driver update, can give
  slightly different files for the same film. Where that matters, `OMS_RENDER_GPU=0` gives SwiftShader's frames, which
  are the same everywhere the pinned Chrome runs.
- A GPU that draws wrongly while reporting itself as hardware is used until the person sets `OMS_RENDER_GPU=0`.
- Each process starts Chrome once more, for about a second, before its first stage.
- Checked on Windows with Intel Arc. macOS (Metal) and Linux (Vulkan) take the same path, which has not been measured
  there yet.
