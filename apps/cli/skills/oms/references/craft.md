# Craft: script, motion, pacing, sound, honesty

## Script

- Write for 75 to 90 percent of the length asked, not a fraction of it. Read at about 2.8 words a second in English and 4.5 characters a second in Chinese: 45 seconds is about 120 words, in four or five scenes.
- One `<Line>` a sentence, one idea a sentence. The lines are the script and the subtitles, so write them as words someone reads with the sound off.
- Never draw the spoken sentence word for word: the caption carries it. Layers carry what a viewer wants to keep in view: a heading, a key line, figures, labels, a formula.
- On screen a label is a phrase, a key line one or two short lines, a figure a number and its name.

## Motion

- **The stage is in use from a scene's first frame.** At the scene's time 0 every layer already draws its base state (low bars, a faint curve, the outline); empty axes or a frame waiting for a word are not a picture, and a frame with only a title is unfinished.
- **One main change a line**, when that line names its subject. Without word times, place it in the line's share of the scene (its `at`, or its slot when the scene's lines share it evenly). A fact is never on screen before its line starts.
- **Motion means something.** An arrival says "here is a new thing", a growth "this quantity", a slide or morph "this became that", a draw "this leads there". A quantity changes by counting up or growing a bar: `Math.round(interpolate(t, [a, b], [0, 76], {easing: Easing.outQuart, clamp: true}))`. Motion that pulls the eye from what the line is about is decoration; leave it out.
- **Ease everything**, and clamp: pass `easing` and `clamp: true` to every `interpolate`. Only time itself moves at a constant speed (`Easing.linear`).
- **Scenes enter**: fade or rise each scene's layers over about half a second (`interpolate(t, [0, 0.5], …)`), from the same ground: keep a film-level ground layer the scenes' colour, so a cut never flashes another one. The cover is the exception (Pacing).
- **One focus at a time.** The rest stays quiet, or dims the same way each time. What a line replaces leaves before the new thing arrives; before and after share a frame only when the line compares them; things that merge go into each other without overprinting.
- **Every object has a reason** the lines give, and goes once that reason is past. A layer lives for its whole scene, so "goes" is a fade inside it.
- **A picture continues; it is not redrawn.** One that runs over several lines is one layer whose numbers move with time. One that carries into the next scene is the same component there, starting where the last scene left it, or a layer in `<Film>`.
- **Show the thing, not a label for it**: a command with what it prints, a file by its contents, a formula with each term lit as it is named, a feeling by a metaphor, a familiar product or kind of thing beside its name.

## Pacing

- **At least two seconds on screen** from when a thing appears to when it goes; a flash only when the flash is the point.
- **Hold the end**: a scene's motion ends a second or more before its `duration`, so its last picture holds.
- **The cover**: frame 0 is the thumbnail. The first scene shows its title picture at t = 0 with no fade (one illustration, one big figure, one short line, nothing else), and the film moves on a few seconds in.
- **A photo holds eight seconds at most**: move it slowly (an interpolated `scale` or `x`) or cut.

## Sound

oms makes no narration, so a film's sound is music the person gives and effects from `oms sound`: its motion's sound when it draws in one, oms's own when it does not.

- **Effects follow the picture**, one cue for each thing a viewer should feel happen, not one for every element: `land` when something arrives and settles, `move` for a slide, morph or camera move (with its length, `at:move:dur`), `draw` for a stroke drawn on (with its length), `count` as a figure counts up, `cut` at a scene's change, `out` as something leaves. Take the times from your board: the moment, not the start of a long ease. An effect that tells the viewer nothing the picture does not is noise; leave it out.
- **The roles are the sound's**: oms's own has all six; a motion's sound gives some of them, not always all; `oms sound` names the ones it has and refuses a cue for any other. Pick the nearest it has (a `move` for something leaving when it has no `out`).
- **One track**: `oms sound` renders every cue into one WAV as long as the film, in the motion's own sound (its `react/sound.json`), or in oms's own, plain and with no bed, when the project has no motion. A sound with a `bed` plays it, a soft tone under the whole film, beneath its hits: that is the motion's, not a fault. The track comes mixed, so play it as it is, `<Sound src="media/effects.wav" />` directly in `<Film>` (the -6 to -10 dB of film-format.md is for a single effect file of your own); under music, take it down 3 to 6 dB (`volume={-4}`). `oms sound` prints the track's peak and each cue's: a cue it marks not heard made no sound, so change its role. Change a cue, render a new track under a new name, and point the `<Sound>` at it.
- **Music**: a bed under everything, `<Sound src="media/music.mp3" loop volume={-16} fadeIn={1} fadeOut={3} />`, between -18 and -14 dB, in from the start or once the title has landed, out a few seconds after the last line. `duck` sinks it only under a narration, and an oms film has none: keep it low enough for the effects to read over it.
- You cannot hear the film: keep levels where these numbers put them, read what `oms sound` prints, and say in your report that the sound is unheard.

## Honest pictures

- A figure on screen carries its scope (who, how many, which task) on the same screen, and is attributed to its source.
- Results from different experiments are not drawn on one axis without saying so.
- A calculation is labelled as one; an illustration says it is one.
- A range that crosses its reference value is drawn hollow, not as a result.
