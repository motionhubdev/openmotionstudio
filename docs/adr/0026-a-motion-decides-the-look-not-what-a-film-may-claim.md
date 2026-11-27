# 26. A motion decides the look, not what a film may claim

> **Status:** Accepted · **Date:** 2026-11-27

Which of the agent's film-making rules a motion from motionhub may replace, and which hold in every film.

## Context

The agent's guidance comes in two places: the Studio's skill (`film.md`, and for terminal agents the `oms` skill with
its references) and the motion a film draws in (its `MOTION.md`, `tokens.json` and Avoid list), written by its author
on motionhub. `film.md` already said a motion's rules come before the format's defaults. As the skill gained rules on
holds, beats, honesty and flashing (adapted from openmotion's recipes), some of them were about a film's style
(one family of easings, a wipe of about a second, three words a beat) and would contradict a motion's own durations,
curves and components, while others (never inventing a price, labelling a generated person) must not give way to any
motion. Motion authors need to know which is which.

## Decision

- **A motion decides how a film looks and moves**: colours, faces, type sizes, spacing, durations, easings, how its
  components are placed and drawn, how many words a beat, its texture (a boiling line, a glitch). The skill's values
  for these are defaults for a film in no motion, and say so.
- **The skill decides what holds in every film**, and a motion's rules come after it:
  - what a film may claim: no invented quote, review, figure, price, code, date, spec or feature; real screens and the
    supplied logo; generated people, documents and pictures said to be generated (`craft.md`, "Honest pictures");
  - what must be readable: text on screen long enough to read twice and settled enough to read, clear of what moves;
  - safety: at most three flashes a second;
  - the shape of the story: a hook, few beats, one call to action, a held last picture.
- `film.md` says the motion's precedence stops there; `craft.md` opens with the two kinds of rule. A new rule in the
  skill is written as one kind or the other.

## Consequences

- A motion cannot make a film that breaks the second list, and its author does not need to repeat those rules in its
  Avoid list. A motion that wants a different style rule writes it in its `MOTION.md` or tokens and it wins.
- Moving a rule from one list to the other changes what every motion on motionhub may do: it is a change to this
  decision, not to the skill's wording.
- A way for a motion to declare its own holds or flash limits would be a change to the motion format, in
  `motionhubdev/motionhub` first.
