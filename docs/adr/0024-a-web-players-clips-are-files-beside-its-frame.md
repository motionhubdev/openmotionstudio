# 24. A web player's clips are files beside its frame

> **Status:** Accepted · **Date:** 2026-11-26

How `oms player` carries a film's recorded clips: as files of their own, handed to the frame by the player, rather
than inside `frame.js`. It amends what [ADR 0018](0018-a-film-plays-on-the-web-from-a-static-folder.md) says the
folder holds; the rest of 0018 stands.

## Context

ADR 0018 put every file the bundle imports, clips included, into `frame.js` as a `data:` URL. A clip is the one import
that is large: a film with several screen recordings made `frame.js` 15 to 17 MB, a third of it base64's overhead, and
a host with a per-file limit (an artifact host allows 16 MB a text file) refused it. A five-minute marketing film with
ten clips had its footage recompressed only to fit.

## Decision

- **Each clip is a file**, `clips/<the first 16 hex of its SHA-256>.mp4` or `.webm` (a MOV is named `.mp4`, the type a
  host serves and Chromium plays its H.264 as), and the bundle names it by that path where it named `build/<file>`.
  Faces, images and the narration stay in `frame.js` as before. The player's page lists the clips (`"clips"` in its
  `#oms-film`).
- **The frame still loads nothing.** Its origin, its policy (`media-src data: blob:`, no `connect-src`) and its two
  hashed scripts are unchanged. The player fetches every clip as the page opens; the frame asks for one by
  postMessage (`{type: 'oms:clip', src}`), and the player answers with the clip as a `Blob`, which crosses into the
  opaque origin by structured clone, or with why it has none. The core (`preview/footage.tsx`, `fromPlayer`) plays it
  from a `blob:` URL it makes itself, as it plays a clip it fetched in the Studio. It asks only when it runs the web
  player's inline film (`window.__omsInline`), so a Studio preview never waits on a parent that does not answer.
- **The player plays once every clip is in**, behind the same spinner as `frame.js`: the picture and the soundtrack
  never wait on a clip mid-film, as they never did when the clips came inside `frame.js`.

## Consequences

- No file in the folder is larger than its largest clip, or `frame.js` without clips (the core, the bundle, faces and
  images), whichever is more; clips download as bytes, a third smaller than before.
- **A film with a clip no longer plays opened from disk**: a page on `file:` cannot fetch, so its frame fails with
  "a page opened from a file cannot fetch its clips: serve the folder". A film without clips still plays from disk, and
  `oms preview` serves either.
- A clip larger than a host's limit for a binary file is still refused; cutting it to the seconds the film needs is the
  remedy, as it was.
- The page still holds every clip whole in memory, as the frame did.
