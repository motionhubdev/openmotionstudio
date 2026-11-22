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

- A music bed comes in once the first thing has been said, not under the cold open: fade in over about a second and out over several, and let it run a few seconds past the last line. The voice stays the loudest thing.
- An effect only where it tells the viewer something the picture does not: a click on a moment the picture already carries only makes the film busier.

## Honest pictures

- A figure on screen carries its scope (who, how many, which task) on the same screen, and is attributed to its source.
- Results from different experiments are not drawn on one axis without saying so.
- A calculation is labelled as one; an illustration says it is one.
- A range that crosses its reference value is drawn hollow, not as a result.
