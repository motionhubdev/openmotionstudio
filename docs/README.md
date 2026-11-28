# Documentation

Read [positioning](prd/positioning.md) first, then [the architecture](tech/architecture.md). The visual system is [design](design.md).

## Product

- [Positioning](prd/positioning.md) — what the Studio is, for whom, instead of what, and its non-goals.

## Technical

- [Architecture](tech/architecture.md) — the components, the film, the agent, and the order of work.

- [The creator’s workflow](tech/creator-workflow.md) — examples, structure, references, recovery, assets and checks.
- [Sound, narration and captions](tech/sound-and-captions.md) — plan: music and effects in and out, captions from lines, a narration per line that times them.
- [The assistant panel](tech/assistant-panel.md) — how it was rebuilt in five slices: turns' tokens and time, turns as blocks, the coding agents' settings, the composer, questions and errors.

- [Desktop updates](tech/desktop-updates.md) — proposed update delivery, restart behavior and packaged upgrade tests.

## Operations

- [Code signing](ops/code-signing.md) — the signing policy, who approves, the privacy statement, and how CI signs a Windows release through SignPath.
- [Publishing oms](ops/publishing-oms.md) — tagging a version of `@motionhub/oms`, approving it on npm, and the first version staged by hand.

## Decisions

- [0001 The Studio is engine-neutral](adr/0001-the-studio-is-engine-neutral.md) — Remotion, HyperFrames or native; superseded by 0005.
- [0002 The Studio is an Electron desktop app](adr/0002-the-studio-is-an-electron-desktop-app.md) — why desktop, and why Electron over Tauri.
- [0003 A built-in agent on the person's own model](adr/0003-a-built-in-agent-on-the-persons-own-model.md) — our own loop, two protocols, the person's key.
- [0004 A film's code runs in a sandboxed frame on its own scheme](adr/0004-a-films-code-runs-in-a-sandboxed-frame-on-its-own-scheme.md) — how agent-written code is isolated from the app.
- [0005 The Studio has one engine, its own](adr/0005-the-studio-has-one-engine-its-own.md) — a film is film.tsx on `@motionhub/runtime`; no adapters.
- [0006 A film is scenes of layers and lines](adr/0006-a-film-is-scenes-of-layers-and-lines.md) — `<Film>` of scenes; no declared animation; read at run time.
- [0007 Local checkpoints track agent source writes](adr/0007-local-checkpoints-track-agent-source-writes.md) — safe, local recovery without Git.
- [0008 The person's own coding agent, through its own headless protocol](adr/0008-the-persons-own-coding-agent.md) — Claude Code or Codex as a second way in, with the person's sign-in.
- [0009 Each turn is logged with its tokens and time](adr/0009-each-turn-is-logged-with-its-tokens-and-time.md) — one line a turn in `.motion-studio/usage.jsonl`, tokens on one footing.
- [0010 A film's sound is `<Sound>` elements, mixed on export](adr/0010-a-films-sound-is-sound-elements-mixed-on-export.md) — dB and seconds in the scene tree, AAC; amended by 0017.
- [0011 Narration is synthesized per line, and times the captions](adr/0011-narration-is-synthesized-per-line-and-times-the-captions.md) — voices in Models, speech in `voice/`, captions from word times; amends 0006; amended by 0012.
- [0012 A narration speaks through the person's own voice provider](adr/0012-a-narration-speaks-through-the-persons-own-voice-provider.md) — no default voice: Azure, ElevenLabs, MiniMax or OpenAI, set up at the first narration; not Edge's guarded service.
- [0013 Each window owns a project](adr/0013-each-window-owns-a-project.md) — independent tasks and preview sessions; superseded by 0014.
- [0014 Project sessions outlive editor windows](adr/0014-project-sessions-outlive-editor-windows.md) — one tray-backed main window, movable dedicated editors, and background tasks on Home.
- [0015 New projects live in a default workspace](adr/0015-new-projects-live-in-a-default-workspace.md) — a configurable Documents location and a fresh directory for every new film or template copy.
- [0016 Terminal agents author films through the OMS command](adr/0016-terminal-agents-author-films-through-the-oms-command.md) — `oms` and a skill for Claude Code and Codex, on the Studio's own build and player.
- [0017 An export is encoded in segments and mixed in blocks](adr/0017-an-export-is-encoded-in-segments-and-mixed-in-blocks.md) — segments joined as they are, which `oms` resumes; sounds summed in JavaScript.
- [0018 A film plays on the web from a static folder](adr/0018-a-film-plays-on-the-web-from-a-static-folder.md) — `oms player` and `oms preview`: the preview core written whole into a sandboxed frame that loads nothing, kept to one mixed soundtrack.
- [0019 A film travels as one .oms file](adr/0019-a-film-travels-as-one-oms-file.md) — `oms pack` and Home's Import project: the project's own files in a motion package's reproducible tar, checked before they reach the disk.
- [0020 oms is published on npm from a tag](adr/0020-oms-is-published-on-npm-from-a-tag.md) — a tag on main packs the tarball once, drives it on three platforms and stages it for a maintainer's approval.
- [0021 The Studio draws stills and exports in the headless Chrome oms uses](adr/0021-the-studio-draws-stills-and-exports-in-the-headless-chrome-oms-uses.md) — one renderer for the Studio and oms, carried by the installer, several at once for an export.
- [0022 A film is drawn on the GPU where it can be](adr/0022-a-film-is-drawn-on-the-gpu-where-it-can-be.md) — the GPU found once a process, SwiftShader otherwise, `OMS_RENDER_GPU` to choose; the same frames per path.
- [0023 A dev build of the Studio can be driven from outside](adr/0023-a-dev-build-of-the-studio-can-be-driven-from-outside.md) — a control server and a script for making and testing films, in dev builds only; the same paths as the UI.
- [0024 A web player's clips are files beside its frame](adr/0024-a-web-players-clips-are-files-beside-its-frame.md) — `oms player` writes each clip to clips/, and the player hands it to the frame as a Blob.
- [0025 The Studio counts anonymous usage unless turned off](adr/0025-the-studio-counts-anonymous-usage-unless-turned-off.md) — a fixed list of events to PostHog under a random id, one switch in Settings.
- [0027 A reference video is studied, never shown](adr/0027-a-reference-video-is-studied-never-shown.md) — Draft: a picked reference kept in `.motion-studio/references/`, studied by `study_reference`, compared beside the film, unreachable from it.
