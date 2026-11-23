# Review: what to look at, and how

## Text first, then pictures

`check` sees layers against the frame and against each other, not what overlaps inside one layer (a label over a curve, a figure clipped by its own box): those only a still shows. Read `oms check "<folder>" --json` first: build and drawing errors, layers past the frame, placed layers that overlap, text past the frame's edge (a component's coordinates are its layer's, not the frame's), faces the film asks for but never loads, and every character, captions included, that the faces it loads lack (each draws in the machine's fallback; the check sees only the frames it draws), and the film's outline (each scene's `start` and `duration`, each line's `start` and `end`, in the film's seconds). Open a picture only for what the text cannot tell you.

Every picture you read stays in your conversation and is sent again with every later step. Read each still once; never cut, crop or enlarge pictures with scripts of your own (each copy is one more picture); give every `oms still` a new `--out` name, since a viewer can show a cached image.

## Where to take stills

- 85 percent of the way through each line (`start + 0.85 * (end - start)`): what a line names has normally appeared by then.
- Just after each scene starts (its base picture), and just before the film's end.
- Times strictly before the film's end.

## The questions, as a viewer who has not seen the plan

1. Is the thing the line is about on screen, and big enough to read on a phone?
2. Is the stage in use: more than a title, more than empty axes, more than a list of bullet points?
3. Is anything cut off, past an edge, under the caption, or overlapping by accident?
4. Could a slide deck have made this?
5. Does it keep the motion's rules (its MOTION.md, its Avoid list)?

## Rounds

A round is one check, the stills you doubt, and one pass of fixes; at most three rounds. Fix everything a viewer would notice in a scene in one edit, then move on.

## An independent reviewer (optional)

When your host can start a subagent, and the film is long or you cannot read images, give a fresh one only: the still paths with each one's time, scene and line; one line a scene saying what it should show; the motion's `MOTION.md`. Not film.tsx, not your own verdict. Ask it for:

> Look at each picture as a viewer who has not seen the plan. Answer in at most eight lines, worst first, each as `P0|P1 · t=<seconds> · where on screen · the problem → the exact change · what must stay`. P0 is what a viewer would notice at once (missing, unreadable, cut off, empty); P1 is what makes it look unfinished. With nothing to report, answer "no problems". No praise, no summary. Edit nothing.

For a film of figures, a second fresh reviewer gets the sources and checks each figure against them, and the picture against the words, by the rules in craft.md, "Honest pictures".
