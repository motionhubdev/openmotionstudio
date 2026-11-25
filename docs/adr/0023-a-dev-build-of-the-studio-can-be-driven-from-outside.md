# 23. A dev build of the Studio can be driven from outside

> **Status:** Accepted · **Date:** 2026-11-24

How an outside agent or a script drives a development build of the Studio (`pnpm dev`) to make an example film or
test it, without operating its window.

## Decision

- **A dev tool, not a product feature.** A dev build starts a control server; a released Studio neither starts nor
  ships it. The code is behind a build constant, `import.meta.env.OMS_DEV_CONTROL` (`electron.vite.config.mts`), true
  only in `electron-vite dev` or in a build made with `OMS_DEV_CONTROL=1` for its test, so the bundle `pnpm package`
  ships does not contain it; it also checks `!app.isPackaged` when it starts. It is on by default in a dev build and
  has no settings UI; `OMS_STUDIO_CONTROL=0` turns it off.
- **Shaped like the agent's MCP server** (`agent/studio-mcp.ts`, ADR 0008): plain HTTP on 127.0.0.1 at a random port,
  answering only at a path with a random secret in it, refusing any request that carries an Origin, so no web page can
  reach it. Its URL is written to `dev-control.json` in the app's user data (mode 0600), and removed when the Studio quits
  (`src/main/dev-control.ts`).
- **The same paths as the UI.** Each call runs `window.studio.*` in the Home view or in the project's editor view, as a
  click there does: the preload bridge, the IPC router in `index.ts` and the project's workspace handlers, with their
  checks (the library's projects only, one task at a time, the agent's approvals, the person's settings). Nothing reaches
  around them. The only addition is a one-shot answer for an export's save dialog (`answerNextSave`), which only this
  server sets; the renderer still cannot name a path.
- **Calls:** `status` (the library, open projects, tasks, each open project's build and export progress), `new` (a
  project from a brief, with an agent: Claude Code, Codex or the built-in one; the brief goes as the UI sends it),
  `say` (a turn of notes), `wait` (until the turn begun since a call ends; its outcome, the agent's last reply and the
  turn's usage line), `voice`, `export` (an MP4 to a path) and `pack` (a film file to a path). Every call is logged
  (`dev-control.call`: its name, the project, how long it took, and whether it failed; never its words).
- **No keys out.** No call returns a provider, a voice provider or a key; voicing and the agent use what the person's
  settings hold.
- **A script, not oms.** `apps/desktop/scripts/studio-control.mjs` reads `dev-control.json` and makes the calls from a
  terminal (`node apps/desktop/scripts/studio-control.mjs new --brief "…" --agent claude`). The published
  `@motionhub/oms` has no such command.
- **Tested** by `pnpm test:control` (`scripts/test-dev-control.mjs`): the release bundle carries none of it, and a build
  that carries it, started on a mock local model, goes new → wait → say → wait → export → pack and refuses a folder
  outside the library; `dev-control.test.ts` covers the secret, the Origin and the file.

## Reason

Making the UTMB example meant driving the Studio with computer use, and it went badly: launching the app opened blank
windows, an export stalled while the window was covered, save dialogs mangled file names, and every step waited for the
person to leave the screen. What only the Studio does (a project from a brief with a chosen agent, a turn of notes to
it, waiting for that turn, voicing, and exports of what the agent made) needs a way in that a script can use.
`oms render` and `oms pack` already export a folder without the Studio.

## Cost

- One more server in a dev build, reachable by any program the person runs that can read their user data. That is the
  same reach as the person's own files and the dev build's DevTools.
- A turn sent through it is not marked as such in the project's conversation yet: it reads as the person's own. It is in
  the log.
- Before it could ever ship, it would need deciding: a setting and consent to turn it on; which calls a released Studio
  allows, and whether an agent's approvals can be answered from outside; how a turn from outside is shown in the
  conversation; and whether `oms` should carry a client.
