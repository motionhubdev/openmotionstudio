# 17. An export is encoded in segments and mixed in blocks

> **Status:** Accepted · **Date:** 2026-11-22

How the Studio and `oms` turn a film's frames and sounds into its MP4, and what a stopped export keeps.

## Decision

`exportFrames` (`apps/desktop/src/main/film/capture.ts`) makes every MP4, the Studio's and `oms render`'s:

- **The picture in segments** of 3,000 frames (100 s at 30 fps). Each is encoded on its own, starting on a key frame,
  written beside its place and moved there only when whole, then the segments are joined as they are (`-c copy`).
  With several stages, each segment's frames are drawn at once and handed to its encoder in turn.
- **What a stopped export keeps.** `oms render` keeps its finished segments in `~/.cache/oms/renders/<chrome>/<name>/`,
  where the name is a hash of everything that makes their pixels (the build's files, the film's size, rate and length,
  the encoder's settings). The same render started again, after Ctrl-C or a crash, draws only the segments that are
  missing. A render that ends whole removes them; one not come back to for seven days is removed by the next. The
  Studio keeps its segments beside the file and removes them however the export ends.
- **The sound mixed in blocks** (`mixSounds`, `mix.ts`), amending [ADR 0010](0010-a-films-sound-is-sound-elements-mixed-on-export.md)'s
  filter graph: each sound's file is decoded once to raw samples at 48 kHz in stereo (a mono file in both channels
  at its own level, as the preview's Web Audio plays it; the graph's conversion took 3 dB off each), and the
  sum is made 30 s of film at a time, each sound read only where it plays, cut, looped, levelled, faded and ducked
  sample by sample by the curves the preview plays (`soundGain`, `ducked` in `shared/sound.ts`). ffmpeg then holds
  the sum under −1 dBTP with the same `alimiter`, pads or cuts it to the film's length, and encodes it AAC beside the
  copied picture and the subtitles.

## Reason

A long film rendered by a terminal agent can take minutes to hours; an interruption should cost at most a segment,
not the render. VisoTalk, which `oms` takes over from, worked this way. A filter graph pads every sound to the whole
film before summing: on 151 sounds over five minutes it took 7.8 s where the block mix takes 1.0 s (VisoTalk measured
fifteen minutes on its own films), and it ducked once an audio frame where the preview ducks every sample.

## Cost

- Every export writes its picture twice more (the join and the mux), as copies: seconds for a long film.
- A video joined from segments is not the bytes one encoder would have written across a boundary (each segment opens
  on a key frame); the pictures are the same.
- `oms`'s kept segments use disk under `~/.cache/oms` until the render ends or a week passes.
- A mono sound, a synthesized narration among them, is 3 dB louder in an export than before this decision, as loud
  as the preview always played it: a film exported again sounds louder in those parts than its earlier export.
