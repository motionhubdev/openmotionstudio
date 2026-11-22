# 16. Terminal agents author films through the OMS command

> **Status:** Accepted · **Date:** 2026-11-22

Whether, and how, Claude Code or Codex in the person's own terminal can make a film the Studio opens.

## Decision

A second package, `apps/cli`, holds the `oms` command and a skill for Claude Code and Codex. `oms install <claude|codex>`
copies the skill and the film format (the film section of `film.md`) into the host's user skills directory
(`CLAUDE_CONFIG_DIR` or `~/.claude`, `CODEX_HOME` or `~/.codex`) and refuses to replace one already there. `oms init`
writes the Studio's starter `film.tsx` into an empty or new folder; `oms check` and `oms still` build the film and draw
it.

`check` and `still` run the Studio's own code, not a copy: `apps/desktop/scripts/build-cli.mjs` bundles
`apps/cli/worker.ts` against `film.ts` (`buildFilmOnce`, the Studio's esbuild options and reporter), `preview.ts`,
`stage.ts`, `review.ts` and `mix.ts`, with the preview core from the same build. The worker is an Electron main
process with its own temporary profile and build directory, a non-persistent session that refuses every
permission, and the film in the same sandboxed offscreen player on the `oms-preview:` scheme
([ADR 0004](0004-a-films-code-runs-in-a-sandboxed-frame-on-its-own-scheme.md)). It writes nothing into the project: a
Studio watching the same folder keeps its bundle. `still` writes only a new PNG and never overwrites one.

The package depends on the Studio's pinned Electron, esbuild and three.js. Electron's binary is downloaded on first
use, under a lock so commands started together download it once. The package is built with `npm pack`; publishing
it, on npm or with a release, is a separate decision.

## Reason

People who already work in Claude Code or Codex want a film from where they are, then the Studio to refine and export
it. Driving the Studio's own build and player keeps one engine ([ADR 0005](0005-the-studio-has-one-engine-its-own.md)):
what `check` passes and `still` draws is what the Studio plays and exports.

## Cost

- The worker reaches into `apps/desktop/src/main/film/`, so a change there can break the CLI: `worker.ts` is in the
  desktop's typecheck, but `scripts/test-installed.mjs` runs by hand against an installed tarball.
- A tarball pins the Studio it was packed from; a project made with an older one may need the Studio's format.
- Each person gets a second Electron (about 100 MB) on first use, and Linux needs a display.
- The worker sets its app path with Electron's `app.setAppPath`, which Electron's types leave out.
- A terminal agent's writes are not the Studio's agent's: they get no checkpoints ([ADR 0007](0007-local-checkpoints-track-agent-source-writes.md)).
