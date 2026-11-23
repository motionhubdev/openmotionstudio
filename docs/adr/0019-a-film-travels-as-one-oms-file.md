# 19. A film travels as one .oms file

> **Status:** Accepted · **Date:** 2026-11-23

How a film an agent made with `oms` reaches the Studio, or another person, as one file rather than a folder.

## Decision

A **film file** (`.oms`) is a project folder's own files in a gzipped ustar tar: the format of a motion's package on
motionhub, with every entry's owner, mode (0644) and time fixed, so the same files always give the same bytes
(`apps/desktop/src/main/oms-file.ts`).

- **Paths** are relative to the project, with `/` between their parts, at the top of the archive: `film.tsx`, `parts/kit.tsx`,
  `media/…`, `voice/…`, `motions/…`. There is no wrapping folder and no manifest: a film file holds `film.tsx`, and its
  name is the project's.
- **Left out**: the Studio's state (`.motion-studio/`, which holds conversations), `.git/`, `node_modules/`, an OS's
  `.DS_Store` and `Thumbs.db`, and at the top of the folder what `oms init`'s `.gitignore` leaves out (renders, their
  subtitles and stills) and film files packed there. A symbolic link stops the packing: it is not the project's.
- **Bounds**: at most 1 GB unpacked and 20,000 files.

**`oms pack <folder> [--out <file.oms>]`** writes one, beside the folder unless `--out` names another place; it is
written whole, then moved into place.

**Import project**, at the foot of Home's prompt (and Ctrl/⌘ O), opens a project folder where it is, or takes a film
file into a new folder in the workspace named after the file (`Thunder.oms` becomes
`Thunder`, or `Thunder 2` beside an earlier one), adds `.motion-studio/` to its `.gitignore` and opens it. The file
is anyone's, so it is read whole and checked before a byte reaches the disk:
- every path is relative, in plain parts (no `..`, no `\`, no `:`, no control characters) and outside `.motion-studio/`;
- it holds `film.tsx`, only regular files (a link is refused) and no more than the bounds.

A file refused, or an import failing part way, leaves no folder behind. Importing never changes an existing project.
A tar made by hand inside a project folder (`tar czf ../film.oms .`) is taken too: its leading `./` is dropped.

## Reason

The folder is the truth (architecture), and the Studio opens one an agent made as it is. A folder is awkward to send,
though: a chat, a mail or a download carries one file. A zip would need a reader and writer the repository does not
have; the motion package's tar is already read by `@motionhub/cli` (`untar`, which refuses links), which the Studio
depends on, and its gzip is Node's. A manifest would be a second truth beside `film.tsx`. Keeping the conversations
out keeps what a person said to their agent with the person.

## Cost

- Open project and the film file share one action, so its dialog asks for either: macOS's picks a folder or a file;
  Windows' and Linux's pick only files, so there a folder is picked by its `film.tsx`.
- An import is a copy: changes made in the Studio do not reach the folder the file was packed from.
- A film's media over 1 GB does not travel this way; such a folder is opened where it is.
- The Studio does not yet write a film file, nor open one from the system (double-click, drag onto the window).
