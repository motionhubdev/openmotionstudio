---
name: oms
description: Create, inspect or revise editable OpenMotionStudio (OMS) motion videos from a brief and local assets. Use for requests such as 用 OMS 制作视频、生成可在 Studio 精修的工程 or updating an existing film.tsx.
---

Read the bundled [film format](film-format.md) before authoring. Run commands in the user's workspace with Node.js 22.12+ and npm. For every `oms` command below, invoke the bundled CLI with this prefix, replacing the sample path with the absolute path to the archive beside this installed SKILL.md:

```sh
npm exec --yes --package="/absolute/path/to/oms/assets/oms-cli.tgz" -- oms --help
```

Replace `--help` with the requested subcommand. npm caches the dependencies on first use. The first preview downloads Electron; Linux preview needs a graphical session or virtual display. If the user explicitly installed the matching OMS CLI globally, its `oms` command also works.

1. For an existing project, read its current film.tsx, imported parts, local media and motion rules. Preserve edits and identifiers outside the request. For a new project run `oms init "<new project folder>"`.
2. Plan the duration, frame size, scene beats and their lines from the brief. Copy supplied assets into the project and reference them by relative path. Use existing local motions when available. The reference describes Studio tools; use local files and OMS CLI in this host. Leave online motion acquisition and voice synthesis to Studio when needed.
3. Write the root film.tsx. Keep meaningful objects in individually named Layer elements. Assign stable scene and line IDs. Use the supplied runtime and deterministic scene time. Keep imported components, fonts and media together with the project.
4. Run `oms check "<folder>" --json`. Read diagnostics, correct errors, then inspect PNGs from `oms still "<folder>" --at 1.5 --out "<new path>.png"` at the busiest moment of each scene and near transitions. Use times strictly before the film's end. Open the images with the host's image viewer and fix framing, legibility and unintended overlaps.
5. Return the project folder, duration and a preview path. Open that folder with Studio's Open Project action to refine layers, captions and timing or export an MP4. On subsequent turns reread the on-disk source before making a scoped edit.
