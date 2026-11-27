# 27. A reference video is studied, never shown

> **Status:** Draft · **Date:** 2026-11-27

How a person remakes a video they admire: the Studio keeps the reference beside the project as something the agent
studies (frames, cuts, timing) and the person compares against, never as something a film can draw, play or export.

## Context

The most asked-for brief after "make me a video" is "make one like this": a launch film, a kinetic title, an explainer
whose rhythm the person wants for their own product. Today the agent cannot see a video: `still` photographs the film,
not a reference, and media import takes pictures, faces and sounds only. The person describes the reference in words,
which loses exactly what they liked: the cut points, the holds, the order of the reveals.

openmotion (nexu-io/openmotion) makes this its main workflow: a reference is broken down into a written shot list
(its `Motion.md`), the shots are rebuilt as editable scenes, and the original and the remake are compared at the same
moment. Its reference library is mostly other people's videos, which is why the rebuild matters: the remake keeps the
motion language and replaces every picture, word and mark.

## Decision

- **The person brings a reference file through the native picker** (MP4, MOV or WebM, at most 10 minutes), from the
  stage or the assistant's attach menu. The Studio fetches nothing from a URL: which video, and the right to study it,
  are the person's.
- **It is kept in `.motion-studio/references/`**, under the first 16 hex of its SHA-256, with
  `.motion-studio/references.json` naming each (`{name, file, seconds, width, height, cuts}`). It is the Studio's
  state, ignored by git and left out of a `.oms` file, so a project never carries someone else's video further.
- **A film cannot reach it.** The build refuses an import from `.motion-studio/`, and the preview scheme does not serve
  it to the film's frame; `check` says why. An export therefore never contains a reference, by construction rather
  than by review.
- **The agent studies it with one tool, `study_reference`** (`name`, `from`, `to`, `frames` ≤ 12), in the Studio's
  tools and its MCP server for Claude Code and Codex. The main process, with the ffmpeg it ships, answers with the
  frames as JPEGs at most 640 px wide, the cut times inside the range (ffmpeg's scene score, found once on import and
  kept in `references.json`), and the reference's length and size. Frames count against the turn's pictures like
  stills.
- **The breakdown is written down in the project's own motion**: `motions/<name>/MOTION.md`, the format a project
  motion already has, with the shots (time, framing, what moves, how it enters and leaves), what is kept and what is
  replaced. The skill says how; the motion format is unchanged.
- **The person compares at the same moment**: the stage gains a Reference view that plays the reference beside the
  film, held to the film's time (with an offset the person sets), served to the Studio's own window only.

## Consequences

- A remake starts from what the reference does, seen, not described; the agent can check its scenes against the
  shots it wrote down.
- References cost disk inside the project folder, uncounted by git; Home's project menu gains "Remove references".
- The Studio's one new path from the disk to the agent is a file the person picked, read only by ffmpeg in the main
  process.
- The agent can be asked to copy a reference too closely; the skill tells it to keep timing and structure and replace
  every picture, word, mark and piece of music, and the export cannot contain the reference itself.
- `oms` has no equivalent yet: a terminal agent with a shell can extract frames itself. A later `oms reference` may
  give it the same tool.

## Open questions

- Whether sound is studied too (beat and onset times from the reference's audio), or left to the person.
- Whether the Reference view's offset is kept per project, and whether a reference can be trimmed to the part studied.
- Whether a project motion holding only a `MOTION.md` (no tokens, no parts) is valid under motionhub's spec, or the
  breakdown belongs in a file of its own.
