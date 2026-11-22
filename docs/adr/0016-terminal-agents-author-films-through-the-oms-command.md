# 16. Terminal agents author films through the OMS command

> **Status:** Accepted · **Date:** 2026-11-22

Whether, and how, Claude Code or Codex in the person's own terminal, or on a server, can make a film the Studio opens.

## Decision

A second package, `apps/cli`, holds the `oms` command and a skill for Claude Code and Codex. `oms install <claude|codex>`
copies the skill and the film format (the film section of `film.md`) into the host's user skills directory
(`CLAUDE_CONFIG_DIR` or `~/.claude`, `CODEX_HOME` or `~/.codex`) and refuses to replace one already there. `oms init`
writes the Studio's starter `film.tsx` into an empty or new folder; `oms check` and `oms still` build the film and draw
it.

`check` and `still` run the Studio's own build, review and sound lookup, not a copy: `apps/desktop/scripts/build-cli.mjs`
bundles `apps/cli/worker.ts` against `film.ts` (`buildFilmOnce`, the Studio's esbuild options and reporter), `serve.ts`,
`review.ts` and `mix.ts`, with the preview core from the same build. The film is drawn in **chrome-headless-shell**,
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
  closed. Frames are taken with `Page.captureScreenshot`, as the Studio's stage takes them.
- **The sandbox**, as HyperFrames decides it: on, except on Linux as root, in a container, on a serverless or
  orchestrated host, or where unprivileged user namespaces are off, where Chrome's sandbox cannot start; a sandbox that
  fails to start is retried without it. Without it `oms` warns once, and the film keeps its page's policy and the
  interception but not the operating system's isolation. `OMS_CHROME_SANDBOX=1` requires the sandbox, `=0` turns it off.

`oms` writes nothing into the project: a Studio watching the same folder keeps its bundle. `still` writes only a new
PNG and never overwrites one. The package depends on `@puppeteer/browsers`, esbuild and three.js. It is built with
`npm pack`; publishing it, on npm or with a release, is a separate decision.

## Reason

People who already work in Claude Code or Codex want a film from where they are, often on a server without a display,
then the Studio to refine and export it. A headless shell needs no display and starts as root where a person's
server runs as root, and a pinned build shared with HyperFrames often costs no download at all. The Studio keeps
Electron ([ADR 0005](0005-the-studio-has-one-engine-its-own.md)): its preview and its export stay one engine. Measured
on Linux in software rendering, `oms still` and the Electron stage drew the same pixels for a plain, a blurred and a
three.js film (at most one level apart in 0.001% of the pixels of the blurred one).

## Cost

- Two Chromiums draw a film: the Studio's Electron (Chrome 156) and the pinned shell (Chrome 158). They agreed where
  measured; on a GPU, or another platform, a frame from `oms` may differ slightly from the Studio's export.
- The pin follows HyperFrames' release: moving it means its new build's digests, or `oms` downloads its own copy.
- On Linux on Arm the Chromium is the distribution's, of any version: its frames may differ more from the Studio's.
- `oms` runs a browser it did not ship when another tool downloaded it, trusted only by its digests.
- The worker reaches into `apps/desktop/src/main/film/`, so a change there can break the CLI: `worker.ts` and
  `chrome.ts` are in the desktop's typecheck, but `scripts/test-installed.mjs` runs by hand against an installed tarball.
- A tarball pins the Studio it was packed from; a project made with an older one may need the Studio's format.
- A terminal agent's writes are not the Studio's agent's: they get no checkpoints ([ADR 0007](0007-local-checkpoints-track-agent-source-writes.md)).
