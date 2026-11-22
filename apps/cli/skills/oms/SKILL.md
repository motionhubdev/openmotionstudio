---
name: oms
description: Make, inspect, revise or render OpenMotionStudio (OMS) motion videos from a brief and local assets, end to end to an MP4. Use for requests to make a video with OMS, to render or update an existing film.tsx, or to create a project to refine in Studio, in any language.
---

Read the bundled [film format](film-format.md) before authoring. Use the installed `oms` command in the user's workspace.

1. For an existing project, read its current film.tsx, imported parts, local media and motion rules. Preserve edits and identifiers outside the request. For a new project run `oms init "<new project folder>"`.
2. Plan the duration, frame size, scene beats and their lines from the brief. Copy supplied assets into the project and reference them by relative path. For a look, find a motion on motionhub with `oms motion search <words>` and take it into the project with `oms motion use <@scope/slug> "<folder>"` (it is downloaded then, once per project); use one the project already holds when it fits. The film format names the Studio's tools: in this host `search_motions` is `oms motion search`, `use_motion` is `oms motion use`, `check` is `oms check` and `still` is `oms still`. Leave voice synthesis to Studio when needed.
3. Write the root film.tsx. Keep meaningful objects in individually named Layer elements. Assign stable scene and line IDs. Use the supplied runtime and deterministic scene time. Keep imported components, fonts and media together with the project.
4. Run `oms check "<folder>" --json`. Read diagnostics, correct errors, then inspect PNGs from `oms still "<folder>" --at 1.5 --out "<new path>.png"` at the busiest moment of each scene and near transitions. Use times strictly before the film's end. Open the images with the host's image viewer and fix framing, legibility and unintended overlaps.
5. When the person wants the video, run `oms render "<folder>" --out "<new path>.mp4"` (it needs their ffmpeg; if it says ffmpeg is missing or incomplete, pass on its install command). Return the MP4, the project folder and the duration. The folder also opens in Studio, with its Open Project action, for refining layers, captions and timing by hand. On subsequent turns reread the on-disk source before making a scoped edit.
