# Craft: script, motion, pacing, sound, honesty

Two kinds of rule. What a film may claim ("Honest pictures"), what must be readable, no more than three flashes a second, and the shape of its story (hook, beats, one call to action) hold in every film, whatever its motion. Durations, easings, layouts and words a beat are defaults: in a motion, its `tokens.json` and `MOTION.md` replace them.

## Script

- Write for 75 to 90 percent of the length asked, not a fraction of it. Read at about 2.8 words a second in English and 4.5 characters a second in Chinese: 45 seconds is about 120 words, in four or five scenes. A narrated film is longer than its speech: each voiced line waits 0.4 s before it, and each scene holds a second after its last, so count those in (eight lines in four scenes add about 7 s).
- One `<Line>` a sentence, one idea a sentence. The lines are the script and the subtitles, so write them as words someone reads with the sound off.
- Never draw the spoken sentence word for word: the caption carries it. Layers carry what a viewer wants to keep in view: a heading, a key line, figures, labels, a formula.
- On screen a label is a phrase, a key line one or two short lines, a figure a number and its name.

## Motion

- **The stage is in use as soon as a scene has entered.** By half a second in every layer draws its base state (low bars, a faint curve, the outline); empty axes or a frame waiting for a word are not a picture, and a frame with only a title is unfinished.
- **One main change a line**, when that line names its subject. Without word times, place it in the line's share of the scene (its `at`, or its slot when the scene's lines share it evenly). A fact is never on screen before its line starts.
- **Motion means something.** An arrival says "here is a new thing", a growth "this quantity", a slide or morph "this became that", a draw "this leads there". A quantity changes by counting up or growing a bar: `Math.round(interpolate(t, [a, b], [0, 76], {easing: Easing.outQuart, clamp: true}))`. Motion that pulls the eye from what the line is about is decoration; leave it out.
- **Ease everything**, and clamp: pass `easing` and `clamp: true` to every `interpolate`, with the motion's easings, or one family of them through a film in no motion. Only time itself moves at a constant speed (`Easing.linear`).
- **Scenes enter**: fade or rise each scene's layers over about half a second (`interpolate(t, [0, 0.5], …)`), from the same ground: keep a film-level ground layer the scenes' colour, so a cut never flashes another one. The cover is the exception (Pacing).
- **One focus at a time.** The rest stays quiet, or dims the same way each time. What a line replaces leaves before the new thing arrives; before and after share a frame only when the line compares them; things that merge go into each other without overprinting.
- **Every object has a reason** the lines give, and goes once that reason is past. A layer lives for its whole scene, so "goes" is a fade inside it.
- **A picture continues; it is not redrawn.** One that runs over several lines is one layer whose numbers move with time. One that carries into the next scene is the same component there, starting where the last scene left it, or a layer in `<Film>`.
- **Still while read.** Words and figures are readable while they are read: whatever moves them settles enough to read before the hold (a motion's own texture may stay), and nothing moving (a streak, a cursor, a prop, a shape's edge) crosses them. A cursor reaches its target before it clicks; typing ends before the cut.
- **A comparison in turn**: the second bar grows once the first has settled, on the same axis; drawn with the motion's comparison when it has one, else as two aligned columns, never two tables.
- **On the beat**: a word or figure lands on its spoken word (within 0.1 s, by `useLine`); a cut set to music, within two frames of a beat.
- **No more than three flashes a second**, and only for a moment: faster flashing is a seizure risk.
- **Show the thing, not a label for it**: a command with what it prints, a file by its contents, a formula with each term lit as it is named, a feeling by a metaphor, a familiar product or kind of thing beside its name.

## Pacing

- **At least two seconds on screen** from when a thing appears to when it goes; a flash only when the flash is the point. Text holds still long enough to be read twice at full speed; in kinetic type, where each word is a beat, half a second at least for a word.
- **Hold the end**: a scene's motion ends a second or more before its `duration`, so its last picture holds.
- **The cover**: frame 0 is the thumbnail. The first scene shows its title picture at t = 0 with no fade (one illustration, one big figure, one short line, nothing else), and the film moves on a few seconds in.
- **The hook**: by two seconds in, the film has said why to watch: a concrete result or a true, surprising line, not a logo.
- **Few beats**: three to five steps, benefits or stops in 30 seconds; one offer, one call to action, asking for one thing, in the last two or three seconds. The film's last picture (the lock-up, the result) holds still for two.
- **A photo holds eight seconds at most**: move it slowly (an interpolated `scale` or `x`) or cut.

## Kinds of film

Starting beats, to change when the brief or a motion says otherwise.

| Kind | Beats | Check |
| --- | --- | --- |
| Ad, promo | hook by 1.5 s, problem, proof shown (a demo, a real screen), payoff, one call to action; a beat every 2 to 5 s | each claim has its source |
| Tutorial, demo | at most five steps, 2 to 3 s each, in the real order; end on the finished result | a viewer could repeat it; labels are the product's |
| Before and after | before 1 to 1.5 s, the product in use 1.5 to 2.5 s, a wipe of about 1 s, after and the result line held 1.5 s | same framing; the change is the one claimed |
| Data story | the baseline, the change, one conclusion the data supports; bars grow over about 1 s as the figure counts; a finished chart holds 1.5 s | scale, units and source on screen |
| Offer, sale | the occasion, the discount, the old price struck then the new, the code and deadline held still, the call to action | one offer; every price, code and date the person's |
| Kinetic type | at most three words a beat, each still 0.5 s or more; an end card held still | every word sharp when read |
| Logo | light from the first frame, the mark resolving over 1 to 2 s, the lock-up still for 2 s | the last frame is the supplied mark |

## Sound

A film's sound is a narration when the person asks for one (`oms voice`, below), music the person gives, and effects from `oms sound`: its motion's sound when it draws in one, oms's own when it does not.

- **Effects follow the picture**, one cue for each thing a viewer should feel happen, not one for every element: `land` when something arrives and settles, `move` for a slide, morph or camera move (with its length, `at:move:dur`), `draw` for a stroke drawn on (with its length), `count` as a figure counts up, `cut` at a scene's change, `out` as something leaves. Take the times from your board: the moment, not the start of a long ease. An effect that tells the viewer nothing the picture does not is noise; leave it out.
- **The roles are the sound's**: oms's own has all six; a motion's sound gives some of them, not always all; `oms sound` names the ones it has and refuses a cue for any other. Pick the nearest it has (a `move` for something leaving when it has no `out`).
- **One track**: `oms sound` renders every cue into one WAV as long as the film, in the motion's own sound (its `react/sound.json`), or in oms's own, plain and with no bed, when the project has no motion. A sound with a `bed` plays it, a soft tone under the whole film, beneath its hits: that is the motion's, not a fault. The track comes mixed, so play it as it is, `<Sound src="media/effects.wav" />` directly in `<Film>` (the -6 to -10 dB of film-format.md is for a single effect file of your own); under music, take it down 3 to 6 dB (`volume={-4}`). `oms sound` prints the track's peak and each cue's own (without the bed, before the next cue): a cue it marks not heard made no sound, so change its role. Change a cue, render a new track under a new name, and point the `<Sound>` at it.
- **Music**: a bed under everything, `<Sound src="media/music.mp3" loop volume={-16} fadeIn={1} fadeOut={3} />`, between -18 and -14 dB, in from the start or once the title has landed, out a few seconds after the last line. With a narration give it `duck={10}`, which sinks it while a line is said; without one, keep it low enough for the effects to read over it.
- **Narration**: the lines are what it says, so write them to be heard: short sentences, numbers as they are said in the words it speaks and as they are written in its `text`, which the caption shows (`<Line id="rise" text="升高了 1.5 °C">升高了一点五摄氏度</Line>`), about 4.5 Chinese characters or 2.5 English words a second. `oms voice` speaks each line whose words changed into `voice/` and keeps the rest; each clip is levelled to -16 LUFS (the whole film, with effects and music over it, measures louder, near -14), so play effects under it 3 to 6 dB lower than without. A voiced line lasts as long as its speech, after a lead of 0.4 s (the scene's first line) or a hold of 0.4 s (the others): give it no `dur`, let `oms check` say which speech is cut short, and lengthen that scene rather than cut the words (speech cut short loses the words past the cut, and their times). A voiced line may take an `at` to start sooner or later than that, in order and without overlapping. Time what the picture does to what is said with `useLine(id)` (its `{start, end, words}` in the scene's time; in Chinese each word is one character, so find a phrase by its characters).
- **A narration the person records**: finish the lines first, then ask for one take of them in order, as written (the `text` where a line has one, read as it is said), in any file ffmpeg reads (m4a, mp3, wav). Pauses between lines, silence before the first and a filler between lines ("嗯", "um") do no harm; a line left out or read too differently does. Keep the take outside the project folder, or out of git. Give `<Film>` `voice="recording:take"` (`take` is a name for the take, any name, not its file's; changing it means importing again) and run `oms voice "<folder>" --recording "<file>"`. It transcribes the take with the first key the environment holds of MiniMax, OpenAI and ElevenLabs (`--transcribe <provider>` picks one; it costs what the provider charges for the take's length, once: the transcript is kept by the file's hash, and the output says when it was used), matches it to the lines character by character and cuts one clip a line into `voice/`. Read what it prints:
  - A line read less than 75 percent as written stops it, writing nothing, with what was heard: they record it again, or you write the line as they said it.
  - Every other line read otherwise is still cut, and listed with each difference (`"一瞬间" heard as "一眨眼"`, `added "嗯"`). Its caption shows the written words, timed by what was said, so a changed word is on screen but not in the sound. A transcriber spells homophones and numbers its own way (`地` as `的`, `3` as `三`): those are not differences to fix. For a real one, write the line as it was said and run the import again; the transcript is kept, so nothing is paid.
  - Words said between the lines are left out of every clip and listed with their times. A filler that shares letters with the next line (English more than Chinese) can instead be taken into that line and shows as one of its differences.
- You cannot hear the film: keep levels where these numbers put them, read what `oms sound` and `oms voice` print, and say in your report that the sound is unheard.

## Honest pictures

- Never invent a quote, review, rating, customer, price, discount, code, deadline, spec, ingredient, feature, date or number: what neither the person nor a source gives stays a visible placeholder, and the report says so.
- A screen is the real product's, with its own labels: no mock interface with invented metrics, placeholder text, or badges and logos it has not earned; steps in their real order, and only steps it does.
- A logo is the supplied file, never redrawn or restyled; any effect on it is gone by its final hold.
- A generated or reconstructed person, document or picture says it is one; never a real customer or a historical photograph.
- Before and after share subject, angle, light and framing (within 5 percent); the change shown is the one claimed, and no label covers it.
- Words on screen are what was said or written: a keyword taken from its line, a translation that says no more than its source, names and terms as given.
- A number is rounded no further than its source, in its units; "after", not "because", unless the source says why; a reported, estimated or computed figure says which it is.
- A figure on screen carries its scope (who, how many, which task) on the same screen, and is attributed to its source.
- Results from different experiments are not drawn on one axis without saying so.
- A calculation is labelled as one; an illustration says it is one.
- A range that crosses its reference value is drawn hollow, not as a result.

The kinds of film and several rules on holds and honesty are adapted from the recipes of [openmotion](https://github.com/nexu-io/openmotion) (Apache-2.0); the offer's beats there follow iart.ai's [promo-video](https://github.com/iart-ai/ecommerce-video-skills/tree/main/skills/promo-video) skill (MIT).
