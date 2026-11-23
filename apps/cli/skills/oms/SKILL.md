---
name: oms
description: Make, inspect, revise or render OpenMotionStudio (OMS) motion videos from a brief and local assets, end to end to an MP4. Use for requests to make a video with OMS, to render or update an existing film.tsx, or to create a project to refine in Studio, in any language.
---

Making a film is a creative task. It is finished when someone who has not read the script would be glad to publish it, not when `oms check` is clean. Each scene needs a visual idea of its own subject (a metaphor, a drawing driven by its data, one object that transforms, a move of the frame) and motion that carries meaning.

Read the bundled [film format](film-format.md) first, then the [example film](example/film.tsx) (copy its structure, not its look). Read each reference below when its step comes.

## Order of work

1. **Start or read.** For an existing project, read film.tsx, its parts, media and motion rules, and keep edits and identifiers outside the request; reread the on-disk source on every later turn. For a new one run `oms init "<new folder>"`.
2. **Facts, then script.** Gather what the film says; never invent a figure. Write the lines for 75 to 90 percent of the length asked, one idea a line ([craft](references/craft.md), "Script").
3. **Board each scene before drawing it.** Its lines; its base picture as layers with boxes in px; for each line, what changes and when. Think of at least two ideas that differ in kind and take the one a newcomer would understand.
4. **Settle the look.** Use the project's motion, or find one on motionhub with `oms motion search <words>` and take it with `oms motion use <@scope/slug> "<folder>"` (downloaded then, once). Without one, write the look in `parts/kit.tsx` ([look](references/look.md)).
5. **Draw one scene, look at it, then the rest.** film.tsx holds the scenes, layers and lines; each scene's picture is its own `parts/<scene>.tsx` ([drawing](references/drawing.md)). After the first scene is drawn and looked at, draw the others simply, so a whole plain film exists within the first third of your time, then improve the weakest scenes. A complete plain film is a video; a half-polished one is not.
6. **Sound, when the film wants it.** Music the person gives goes into `media/` with its licence noted ([assets](references/assets.md)). Effects come from the motion's own sound: list the moments the picture makes as cues, in the roles the motion's sound has (of `land`, `move`, `draw`, `count`, `cut`, `out`; `oms sound` names them and refuses any other) and run `oms sound "<folder>" --cues "1.2:land, 3.4:move:0.6" --seconds <the film's length> --out media/effects.wav`, then play it across the film with `<Sound src="media/effects.wav" />`, as the motion mixed it, 3 to 6 dB lower under music. Read the levels it prints: a cue marked not heard needs another role ([craft](references/craft.md), "Sound"). A new `--out` each time the cues change.
7. **Review in rounds, at most three.** A round is `oms check "<folder>" --json`, stills where you doubt, and one pass of fixes ([review](references/review.md)). Fix everything a viewer would notice in a scene in one edit.
8. **Render and report.** `oms render "<folder>" --out "<new path>.mp4"` needs the person's ffmpeg; if it says ffmpeg is missing or incomplete, pass on its install command. Return the MP4, the project folder and the duration. When the person wants the film on the web, `oms player "<folder>" --out "<new folder>"` writes a folder any static host plays without a render, or its index.html opened from disk (`oms preview "<folder>"` plays it on this machine and follows changes). The folder also opens in Studio, with its Open Project action, for refining by hand.

Assets the person gives or you fetch follow [assets](references/assets.md).

## In this host

The film format names the Studio's tools: here `check` is `oms check`, `still` is `oms still "<folder>" --at <seconds> --out "<new path>.png"` (a time strictly before the film's end; a new path each time), `search_motions` is `oms motion search` and `use_motion` is `oms motion use`. oms speaks no narration: a film's lines are its captions (`<Film captions>`), and a voice is added in Studio.
