# Changelog

Every key change to OpenMotionStudio, newest first, by date. What counts as key and the entry format are in
`CLAUDE.md`, "The changelog".

## 2026-11-24 — oms 0.2.0

- **What:** `@motionhub/oms` 0.2.0 on npm, with everything since 0.1.0: films play recorded clips (`<Video>`); `oms render` draws on the GPU where it can be and says which path it drew on (`OMS_RENDER_GPU=0` or `1` to choose); a frame's limit counts only the time the computer is awake, and a Chrome that does not answer when it is closed is killed; `oms pack` leaves out the project's dot-folders and names them; `oms font` cuts in the words a film imports from outside its folder.
- **Why:** These changes reached `main` after 0.1.0, and people who installed `oms` from npm had none of them; a minor version because they add features, not only fixes.
- **Breaking:** An export's pixels now depend on the machine's GPU and driver; `OMS_RENDER_GPU=0` gives the software frames, the same everywhere.
- **Upgrade:** `npm install -g @motionhub/oms@latest`, and update the skill (`npx skills update oms -g`, or `oms install` again).
- **Refs:** `apps/cli/package.json`, [publishing oms](docs/ops/publishing-oms.md), the entries below from 2026-11-23 to 2026-11-24.

## 2026-11-24 — OpenMotionStudio v0.2.0

- **What:** A release with everything since v0.1.3: the Studio exports in headless Chrome, several stages at once, drawn on the GPU where it can be; an export keeps running with the window hidden and can be cancelled while a frame hangs; a film travels as one `.oms` file, opened from the system or with Import project, without the project's dot-folders; films play recorded clips (`<Video>`) and keep a recorded narration; the assistant picked on Home is the new project's; updates are downloaded in the app and installed on restart. Installers for macOS (Apple silicon and Intel), Windows (x64) and Linux (x64 and ARM64 AppImages) are on GitHub Releases.
- **Why:** These changes reached `main` after v0.1.3, and the people using a release had none of them; a minor version because they add features, not only fixes.
- **Breaking:** An export's pixels now depend on the machine's GPU and driver (`OMS_RENDER_GPU=0` gives the software frames, the same everywhere); a film with mono sounds or a synthesized narration exports 3 dB louder in those parts; an MP4 from a film with `<Film captions>` has no subtitle track, its `.srt` beside it as before.
- **Upgrade:** Install v0.2.0 by hand over v0.1.3 from GitHub Releases or openmotion.studio; later releases arrive in the app. The Windows installer stays unsigned until SignPath is set up.
- **Refs:** `apps/desktop/package.json`, the entries below from 2026-11-20 to 2026-11-24.

## 2026-11-24 — Cancel stops an export whose frame never comes

- **What:** Cancel on "Exporting n%" stops the export at once, and frees the Studio, even while a stage is waiting for a frame its Chrome never gives back; a headless Chrome that does not answer when it is closed is killed 5 s on, in the Studio and in `oms`.
- **Why:** An export of the UTMB example hung on a frame; its cancel was seen only between frames, and closing a Chrome that no longer answered waited for it forever, so "× Exporting 38%" did nothing.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/film/capture.ts`, `apps/desktop/src/main/film/chrome.ts`.

## 2026-11-24 — The assistant picked on Home is the new project's

- **What:** The marks of the assistants ready under Home's prompt are a choice, the first picked unless the person clicks another; Start creating opens the new project with that agent, and its brief goes to it as soon as the film is ready.
- **Why:** Choosing Claude Code under the prompt opened the project with "Set up a model" selected (the built-in agent, with no model), and the brief waited until the agent was picked again in the project.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/home.tsx`, `apps/desktop/src/main/index.ts`, [design](docs/design.md).

## 2026-11-24 — An export runs to its end with the Studio's window hidden and the computer left alone

- **What:** While an export runs, the Studio holds a power request (`prevent-app-suspension`): the computer does not sleep under it, and macOS does not put a Studio with its window hidden into App Nap. A frame's 60 s limit counts only the time the computer is awake, so an export that was asleep with the computer (a lid closed) carries on when it wakes, in the Studio and in `oms`.
- **Why:** The UTMB example's export ran from the evening with its window behind other apps, reached 38 % and failed the moment the laptop woke from standby: the frame on its way when it slept had "taken longer than 60 s".
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/workspace.ts`, `apps/desktop/src/main/film/chrome.ts`.

## 2026-11-24 — A film file leaves out the project's dot-folders, and says so

- **What:** Film file (.oms) in the Studio and `oms pack` leave out every folder whose name starts with a dot, wherever it is in the project, as they already left out `.git/` and `.motion-studio/`; the Studio's notice and `oms pack` name each one left out with its size. Dot-files such as `.gitignore` are still packed.
- **Why:** A tool's cache in the project went into the film: the UTMB example's `.data-cache/`, 182 MB written by the agent's fetch script, made a 170 MB film file of a 1.8 MB film.
- **Breaking:** None. A film file packed from a project that kept a film's own files in a dot-folder no longer holds them; no part of the film format lives in one.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/oms-file.ts`, `apps/cli/oms.mjs`, ADR 0019.

## 2026-11-24 — A film is drawn on the GPU where it can be

- **What:** The Studio's stills and exports, and `oms render` and `oms still`, draw a film's WebGL on the machine's GPU (ANGLE on Direct3D 11, Metal or Vulkan) when the headless Chrome can draw it there, and in SwiftShader on the CPU when it cannot (no GPU, a blocklisted one, a software driver). It is found once a process, and every stage of an export draws on the same path. `OMS_RENDER_GPU=0` asks for the CPU, `=1` for the GPU even where Chrome blocklists it. The export's notice ("drawn on the GPU (…)") and `oms render` say which drew it.
- **Why:** The UTMB example exported in about 25 minutes on SwiftShader and in under 3 minutes on the laptop's Intel Arc GPU, with frames the same to the eye (46.9 dB PSNR against SwiftShader's).
- **Breaking:** An export's pixels now depend on the machine's GPU and driver: the same film on two machines can give slightly different files. `OMS_RENDER_GPU=0` gives the software frames, the same everywhere.
- **Upgrade:** Nothing. Set `OMS_RENDER_GPU=0` where frames must match across machines.
- **Refs:** ADR 0022, `apps/desktop/src/main/film/chrome.ts`, `apps/cli/worker.ts`.

## 2026-11-24 — A `.oms` film file opens in the Studio from the system

- **What:** The installers register `.oms` (`application/vnd.openmotionstudio.film`) with a document icon, and the Studio takes a film file the system hands it (a double-click, Open with, a drop on the Dock) into a new project as Home's Import does, starting or bringing forward the running Studio. Windows's NSIS installer registers the type and its uninstaller removes it; macOS declares the type `dev.motionhub.studio.film`. On Linux the desktop file names the type, and `resources/openmotionstudio-film.xml` beside the program says what `*.oms` is, for `xdg-mime install`.
- **Why:** A film file downloaded from openmotion.studio could only be opened from inside the Studio.
- **Breaking:** None.
- **Upgrade:** Install the new version with its installer (Windows, macOS). On Linux, install the desktop file and the mime file as `docs/tech/creator-workflow.md` says.
- **Refs:** `apps/desktop/electron-builder.yml`, `apps/desktop/build/`, `apps/desktop/src/main/index.ts`, `apps/desktop/src/main/oms-file.ts`, [creator workflow](docs/tech/creator-workflow.md).
## 2026-11-24 — The Studio exports in headless Chrome, several at once, with a GPU trial

- **What:** The Studio draws its stills and exports in the same chrome-headless-shell `oms render` uses, one browser a core as memory allows, instead of one offscreen Electron window; the installer carries that Chrome. `OMS_RENDER_GPU=1` is a trial that draws a film's WebGL on the machine's GPU (ANGLE: Direct3D 11 on Windows, Metal on macOS, Vulkan on Linux) in place of SwiftShader. Also from the same work: the agent's `use_font`, thirty minutes for Claude Code's long tools, a film file saved from the export menu, MiniMax's split words taken once, a film's WebGL contexts freed as its canvases go, and the composer keeping its words when the agent is switched.
- **Why:** A 1:55 three.js film took over an hour to export from the Studio. In headless Chrome it took 391 s on a Windows laptop (3 browsers), and 129 s with `OMS_RENDER_GPU=1` on its Intel Arc GPU, the picture the same to the eye (PSNR 44-46 dB against the software draw).
- **Breaking:** None. A GPU draw is not bit for bit the software one, so it stays opt-in until it is checked on macOS and Linux.
- **Upgrade:** Install the new version. To try the GPU, start the Studio or `oms render` with `OMS_RENDER_GPU=1`.
- **Refs:** ADR 0021, `apps/desktop/src/main/film/chrome.ts`, `apps/desktop/src/main/film/capture.ts`, `apps/desktop/src/main/film/stage.ts`, `apps/desktop/scripts/fetch-chrome.mjs`.

## 2026-11-24 — `oms font` cuts in words a film imports from outside its folder

- **What:** `oms font` builds the film and takes the characters of every source it is built from, beside the project's own, so text a film imports from outside its folder (a copy file shared by several films) is in the face it cuts. A film that does not build (one importing the very fonts being fetched again, say) is cut from the project's own sources, and oms says what it left out and why.
- **Why:** A film drawing words from a shared file outside its project got a face without them, and those characters fell to the machine's own font.
- **Breaking:** None.
- **Upgrade:** Update oms, and run `oms font` again in a film that imports words from outside its folder.
- **Refs:** `apps/cli/font.ts`, `apps/cli/worker.ts`, `apps/cli/oms.mjs`.

## 2026-11-24 — A film plays recorded clips: `<Video>`

- **What:** `<Video src={clip}>` (from `@motionhub/runtime`, the clip imported as an image is) draws the clip in the preview, stills, the export, oms's web player and the timeline's scene frames, where it was a grey box. Each frame of a still or an export shows the clip's own frame at that time: the page waits until the clip has been moved there and its frame painted, and oms, where it drives Chrome's frames, draws them while it waits. While the preview plays, the clip plays beside the film's clock. It honours `startAt`, `trimBefore`, `playbackRate` and `objectFit`, plays muted and holds its last frame once it has ended. A film may import a MOV (a macOS screen recording) as well as MP4 and WebM. A clip named by a path, not imported, is refused with how to give it, and one that cannot play, load or reach its frame fails the film with its reason. Each place a film plays holds each whole clip in memory, so clips are cut to the seconds they are shown.
- **Why:** Films made from screen recordings and footage (a product walkthrough, a demo) could not be made: every clip rendered as a placeholder.
- **Breaking:** None: a film that drew `<Video>` showed a grey box and now shows its clip.
- **Upgrade:** Update oms (`npm install -g @motionhub/oms@latest`) and the skill (`npx skills update oms -g`, or `oms install` again) for the film format that names `<Video>`.
- **Refs:** `apps/desktop/src/preview/footage.tsx`, `apps/desktop/src/preview/core.tsx`, `apps/cli/chrome.ts`, `apps/cli/scripts/test-installed.mjs`, `apps/desktop/scripts/test-studio.mjs`, [architecture](docs/tech/architecture.md) ("Video"), `apps/desktop/src/main/film/film.md`.

## 2026-11-23 — The oms skill installs with `npx skills add`

- **What:** `npx skills add motionhubdev/openmotionstudio --skill oms -g` installs the oms skill for Claude Code, Codex and the other agents the `skills` installer knows. The skill folder now holds its film format and example film itself, so it is whole however it is installed; `oms install` copies that folder alone. The repository's `run-desktop` skill, for working on the Studio, is marked internal and not offered.
- **Why:** `skills add` copies a skill's folder from the repository, and it found only `run-desktop`: the oms skill sat outside the folders it searches, and its film format and example were added at packing.
- **Breaking:** None.
- **Upgrade:** Nothing: a skill installed by `oms install` holds the same files.
- **Refs:** `skills.sh.json`, `apps/cli/skills/oms/`, `apps/desktop/scripts/build-cli.mjs`, `apps/cli/oms.mjs`, `apps/cli/__tests__/skill.test.ts`.

## 2026-11-23 — The check names characters no face on the machine has

- **What:** On a machine with no face at all for a film's characters (Chinese on a Linux server without Chinese fonts), the check before an export and `oms check` said nothing about them, though the film drew them as empty boxes. They are now named like any character the film's faces lack.
- **Why:** The check compared a character in the film's faces with the generic face's, and a character no face has is drawn as the first face's missing-glyph box, which differs from the generic face's: it read as drawn.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/shared/preview.ts` (the frame's inspection).

## 2026-11-23 — `oms` is installed from npm

- **What:** `@motionhub/oms` is published on npm (`npm install -g @motionhub/oms`), from a tag `oms-v<version>` on main: the workflow packs the tarball once, drives it installed on Linux, macOS and Windows, and stages it on npm by trusted publishing for a maintainer's approval. Every pull request now packs, installs and drives `oms` on the three platforms too.
- **Why:** A person or their agent can get `oms` without the repository and pnpm, and each version is tested as people install it, where they use it.
- **Breaking:** None.
- **Upgrade:** `npm install -g @motionhub/oms` replaces a tarball installed by hand.
- **Refs:** [ADR 0020](docs/adr/0020-oms-is-published-on-npm-from-a-tag.md), [publishing oms](docs/ops/publishing-oms.md), `.github/workflows/publish-oms.yml`, `.github/workflows/build.yml`, `apps/cli/package.json`.

## 2026-11-23 — A film travels as one `.oms` file: `oms pack`, and Import project in the Studio

- **What:** `oms pack <folder> [--out <file.oms>]` writes a project as one film file (`<folder>.oms` beside it by default): the project's own files in a gzipped tar, the format of a motion's package, without renders, stills, `.git`, `node_modules` or the Studio's state (`.motion-studio/`, which holds conversations). Home's Open project becomes **Import project**, at the right of the prompt's foot (and Ctrl/⌘ O): it opens a project folder where it is (picked by its `film.tsx` on Windows and Linux), or takes a film file into a new folder in the workspace named after it and opens it; a file holding a path outside its project, a link or no `film.tsx` is refused and leaves nothing behind.
- **Why:** A film an agent made in a terminal reaches the Studio, or another person, as one file a chat or a mail can carry.
- **Breaking:** None: a new file format beside the folder, which stays the truth.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** [ADR 0019](docs/adr/0019-a-film-travels-as-one-oms-file.md), `apps/desktop/src/main/oms-file.ts`, `apps/cli/worker.ts`, `apps/cli/oms.mjs`.

## 2026-11-23 — The Studio keeps a recorded narration, and offers only the weights a face has

- **What:** A film narrated from the person's own recording (`voice="recording:<name>"`, from `oms voice --recording`) opens in the Studio with a Voice view that says so, lists any line missing from the take, and no longer asks to choose a provider, whose voice would have replaced the recording. A text picked on the picture is offered only the weights its face is declared in (a film's Noto Sans SC at 400 and 900 offers those two), not all nine.
- **Why:** Opening an `oms` project in the Studio, the Voice view invited the person to speak over their own recording, and a weight the film's face lacks drew in a fallback face.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/voice-view.tsx`, `apps/desktop/src/renderer/src/preview.tsx`, `apps/desktop/src/preview/pick.ts`, `apps/desktop/src/shared/preview.ts`, `docs/tech/sound-and-captions.md`.

## 2026-11-23 — `oms voice --recording` says every difference from the script

- **What:** Importing a recording now says who transcribed it, and when the transcript kept from an earlier import was used (nothing paid); lists every line that was cut though read otherwise than written, each difference as written against heard (`"一瞬间" heard as "一眨眼"`, `added "嗯"`), since its caption shows the written words; and lists the words said between the lines, which no clip holds, with their times. `oms voice --list` puts a tab after each voice, whose name may hold blanks. A web player opened from disk no longer logs an error for the soundtrack it cannot fetch. The skill says what to ask the person to record, what `recording:<name>` names, how to read the import, that a voiced line may take `at`, and how long a narrated film runs past its speech.
- **Why:** A trial import cut a line with a word changed at 97 % and said nothing, so the caption showed a word the narration did not say; and it gave no way to tell who transcribed the take or whether it was paid for again.
- **Breaking:** None. A script that read `oms voice --list` by its two blanks reads a tab now.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/main/recording.ts`, `apps/cli/worker.ts`, `apps/cli/oms.mjs`, `apps/cli/player.ts`, `apps/cli/skills/oms/`, `docs/tech/sound-and-captions.md`.

## 2026-11-23 — Films draw with `@motionhub/runtime` 0.8.1

- **What:** The Studio, `oms` and an exported Remotion project draw with `@motionhub/runtime` 0.8.1: word captions in Chinese and Japanese join without blanks, a caption's lengths are pixels in either form, a caption with no colour of its own is white on a dark ground and keeps 64 px from the frame's sides, and a film's voice may name a provider's voice with blanks and brackets (`minimax:Chinese (Mandarin)_News_Anchor`).
- **Why:** What OpenMotionStudio's film trials found wrong in captions and voices, fixed in the runtime.
- **Breaking:** None.
- **Upgrade:** Nothing; `oms` takes it with the next install.
- **Refs:** motionhubdev/motionhub#117, `apps/desktop/package.json`, `apps/desktop/src/main/film/remotion-export.ts`.

## 2026-11-23 — `oms voice --recording` takes a narration from the person's own take

- **What:** `oms voice <folder> --recording <file>` takes a film's narration from one take of its lines, read by the person as written, in a film whose voice is `recording:<name>`: the take is transcribed with each word's time by MiniMax, OpenAI or ElevenLabs (`--transcribe`, else the first whose key the environment holds; kept by the file's hash in `~/.cache/oms/transcripts`), matched to the lines character by character, and cut into `voice/` one clip a line, as a spoken narration's are. Each caption word is the script's own text, timed by what was heard for it. A line heard less than 75 % as written stops the import with what was heard, and nothing is written.
- **Why:** A person often wants their own voice on a film an agent wrote; read from the script, the take times the film and its captions as a synthesized voice does.
- **Breaking:** None.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/main/recording.ts`, `apps/desktop/src/main/narration.ts`, `apps/cli/worker.ts`, `apps/cli/oms.mjs`, `apps/cli/skills/oms/`, `docs/tech/sound-and-captions.md`, `docs/adr/0016-terminal-agents-author-films-through-the-oms-command.md`.

## 2026-11-23 — `oms voice` speaks a film's narration

- **What:** `oms voice <folder>` speaks the film's lines in its `<Film voice>` into `voice/`, as the Studio's Voice the film does: only lines whose words changed are spoken, and each voiced line then lasts as long as its speech in the preview, `oms render` and the web player. The key is read from the environment oms runs in (`MINIMAX_API_KEY`, with `MINIMAX_REGION=china` or `MINIMAX_BASE_URL` for an account on minimaxi.com; `ELEVENLABS_API_KEY`; `OPENAI_API_KEY`; `AZURE_SPEECH_KEY` with `AZURE_SPEECH_REGION`), never written or printed. `oms voice --list <provider>` gives its voices. `oms check` says which lines are not yet spoken and which speech is cut short. The film format `oms install` puts beside the skill keeps its narration rule, and the skill says how to write and time a narration.
- **Why:** A film made with `oms` could only be captioned; the Studio already speaks a film's lines, and `oms` now uses the same code and the same `voice/`.
- **Breaking:** None. A project voiced by `oms` opens in the Studio as it is.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again. A MiniMax voice whose name has blanks (`Chinese (Mandarin)_News_Anchor`) needs `@motionhub/runtime` 0.8.1.
- **Refs:** `apps/cli/worker.ts`, `apps/cli/oms.mjs`, `apps/desktop/src/main/voice.ts`, `apps/desktop/src/main/narration.ts`, `apps/desktop/scripts/build-cli.mjs`, `apps/cli/skills/oms/`, `docs/adr/0016-terminal-agents-author-films-through-the-oms-command.md`.

## 2026-11-23 — Motion search finds any of its words; a web player seeks on any host; a check names every face a stack lacks

- **What:** A motion search (`oms motion search`, the Studio agent's `search_motions`) gives the motions with any of its words, those with more of them first, where it gave only those with every word; `oms motion search` with nothing found lists the words motions are tagged with. A web player takes its whole soundtrack into memory, so it seeks on a host that answers no range requests. A check names every face of a stack it reaches before a loaded or generic one, not only the first. `oms font` takes several families at once (`--family` again, each `Name` or `Name:400,700`). The film format and the skill say a motion's own components are drawn as it made them, and that a check does not see what overlaps inside one layer.
- **Why:** A sixth trial of the skill, a data film in a motion it was asked to use, found no motion for "chart data", saw a web player's seek jump back to its start on a plain static server, needed a second check to learn its Chinese face was missing, ran `oms font` once a family three times over, and met a motion component that seemed to break the motion's own rule.
- **Breaking:** None. A search that found nothing may now find motions with some of its words.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/main/motions.ts`, `apps/desktop/src/main/agent/tools.ts`, `apps/cli/player.ts`, `apps/desktop/src/shared/preview.ts`, `apps/cli/oms.mjs`, `apps/desktop/src/main/film/film.md`, `apps/cli/skills/oms/`.

## 2026-11-23 — A check says where an error was thrown and warns of a scene still empty after it enters; `oms init` ignores renders

- **What:** An error a film's page throws, in the check before an export, in `oms check` and in `oms still`, now names the project file, line and column it was thrown at, from the bundle's source map, instead of a bundled name alone (`Cannot access 'W' before initialization (at parts/cover.tsx:5:16)`). The check also draws each scene half a second after it opens and warns when none of its layers shows anything yet. `oms init` writes a `.gitignore` for the renders, subtitles and stills at the top of the folder and the Studio's state. The skill gives a portrait film's layout and caption numbers, takes the film's length for `oms sound` from `oms check`, says the first run downloads Chrome, and holds the second scene until the first has been checked and looked at.
- **Why:** A fifth trial of the skill, a portrait film, met an error named only by a bundled variable, contradictory portrait numbers, and captions running to the frame's edges, and drew all its scenes before looking at one.
- **Breaking:** None. A check draws one more frame a scene.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/main/film/film.ts`, `apps/desktop/src/main/film/review.ts`, `apps/desktop/src/shared/preview.ts`, `apps/desktop/src/preview/core.tsx`, `apps/cli/oms.mjs`, `apps/cli/worker.ts`, `apps/desktop/src/main/film/film.md`, `apps/cli/skills/oms/`.

## 2026-11-23 — `oms font` takes a face cut to the film's words; a film with captions exports without a second subtitle track; check warns of overlapping layers

- **What:** `oms font <folder> --family <name> [--weights 400,700]` takes a face from Google Fonts cut to the characters the project writes, into `media/fonts/` with its licence (its copyright, and the SIL Open Font License's text when it is under it), and prints the `@font-face` to declare. An export of a film that draws its lines as captions (`<Film captions>`) no longer embeds them as a subtitle track as well; the `.srt` beside it is still written, and the export dialog says so. The check before an export warns of two placed layers of a scene that overlap. The film format says a film's own caption lengths are numbers of pixels.
- **Why:** A fourth trial of the skill spent most of its look on finding and cutting a Chinese face by hand, got two sets of subtitles in a player that showed the track over the drawn captions, saw its caption padding ignored when written as '14px', and found an overlap between layers only by eye.
- **Breaking:** An MP4 exported again from a film with `<Film captions>` has no subtitle track; its `.srt` is beside it as before.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/cli/font.ts`, `apps/cli/oms.mjs`, `apps/desktop/src/main/film/capture.ts`, `apps/desktop/src/main/film/review.ts`, `apps/desktop/src/renderer/src/export-dialog.tsx`, `apps/desktop/src/main/film/film.md`, `apps/cli/skills/oms/`, `docs/adr/0016-terminal-agents-author-films-through-the-oms-command.md`.

## 2026-11-23 — A check names every character a face lacks, captions included; `oms sound` writes where you say and measures each cue alone

- **What:** The check gathers what falls to an unloaded or fallback face over every frame it draws and warns once a face, naming each layer and the captions with all their characters; it had warned once a face at the first layer it saw and never looked at captions. `oms sound --out` is a path from the current directory, as `still`'s and `render`'s are, and must be inside the project; it was a path inside the project. Each cue's printed peak is now its own: measured without the sound's bed and before the next cue begins.
- **Why:** A third trial of the skill missed characters lacking in a later title and in its captions, wrote its effects track to a doubled path, and read cue levels that were the bed's and their neighbours'.
- **Breaking:** `oms sound --out media/effects.wav` run from outside the project now refuses the path; give it from where you run it, as `--out "<folder>/media/effects.wav"`.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/shared/preview.ts`, `apps/desktop/src/main/film/review.ts`, `apps/desktop/src/main/film/effects.ts`, `apps/cli/oms.mjs`, `apps/cli/skills/oms/`.

## 2026-11-23 — The skill draws a film in a look of its own unless a motion is asked for, and `oms sound` has a sound of its own

- **What:** The skill's look step no longer searches motionhub by default: a film gets a look of its own in `parts/kit.tsx`, and `oms motion search` and `oms motion use` run only when the project already has a motion or the person asks for one. `oms sound` in a project with no motion that has a sound renders oms's own sound (every role from `land` to `out`, no bed) instead of refusing. The film format and the skill say how a film in no motion styles its captions (its own `caption` tokens in a `<MotionScope>` around the `<Film>`), since without a motion `<Film captions>` draws black text on nothing.
- **Why:** A film's look should come from its subject, as VisoTalk's did, not from whichever motion a search turns up; a film in a look of its own still needs its effects, and a trial in one drew its captions black on a dark ground.
- **Breaking:** None. A project with no motion now gets a track from `oms sound` where it got an error.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/cli/skills/oms/`, `apps/desktop/src/main/film/effects.ts`, `apps/desktop/src/main/film/film.md`, `docs/tech/architecture.md`.

## 2026-11-23 — `oms player` and `oms preview` play a film in a browser without rendering it

- **What:** `oms player <folder> --out <new folder>` writes a folder any static web host plays: a player page with motionhub's reel controls, and the film drawn by the Studio's preview core in a sandboxed frame that loads nothing from the host (its document, with the film, its faces and its images, is in `frame.js`), so it plays on hosts that refuse cross-origin loads, such as artifacts, and opened from disk. Its sounds are one soundtrack mixed as its MP4's, which keeps the clock. A stalled soundtrack or an image still loading holds the picture, an image for at most five seconds. A browser that refuses sound plays the film muted with a "Tap for sound" button. `oms preview <folder>` plays the same at http://127.0.0.1:4173/ and reloads it at its time when a project file changes. The preview core's still page can now be moved by its parent (`oms:seek`), says whether an image it shows is loading, and takes a film and a narration carried in its page.
- **Why:** A film made with `oms` could only be watched once rendered; a web page lets it be shared and watched at once, as VisoTalk's works could.
- **Breaking:** None.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again, for the skill's note on the web player.
- **Refs:** `apps/cli/web.ts`, `apps/cli/player.ts`, `apps/cli/oms.mjs`, `apps/cli/worker.ts`, `apps/desktop/src/preview/core.tsx`, `apps/desktop/src/shared/preview.ts`, `docs/adr/0018-a-film-plays-on-the-web-from-a-static-folder.md`.

## 2026-11-23 — A check finds characters no loaded face draws, and `oms sound` says what it made

- **What:** The check before an export (and `oms check`) also warns when characters of a text fall past the faces the film loads to a face it never loaded (Chinese after a Latin face), naming them; it had looked only at the first face of each stack. `oms sound` refuses a cue in a role the motion's sound does not have, naming the roles it has, where it had rendered silence, and prints the track's peak and average level and each cue's peak, marking a cue that made no sound. The film format and the skill put a motion's own rules (its type sizes, how its components are placed) before their defaults, place a component drawn in the frame's coordinates in a layer the size of the frame, explain how loud to play a motion's effects track and its bed, and allow fonts under the SIL Open Font License.
- **Why:** A second trial of the skill heard nothing at a cue in a role its motion lacked, could check its effects only by measuring the WAV itself, got no warning for Chinese set past a loaded Latin face, and met film-format rules its motion contradicted.
- **Breaking:** None. A command that passed `oms sound` a role its motion lacks now fails instead of writing a track with a silence there.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/shared/preview.ts`, `apps/desktop/src/main/film/review.ts`, `apps/desktop/src/main/film/effects.ts`, `apps/desktop/src/main/film/film.md`, `apps/cli/oms.mjs`, `apps/cli/skills/oms/`.

## 2026-11-22 — A check finds text past the frame and faces never loaded, and `oms sound` makes effects

- **What:** The check before an export (and `oms check`) also draws each line 85 % of the way through and inspects every frame it draws: text running past the frame's edge, and text set in a face that neither the film nor its motion loads (so it draws in the machine's fallback), each said once as a warning. `oms sound <folder> --cues <at:role,…> --seconds <s> --out <new.wav>` renders the project's motion's sound (`react/sound.json`) for the film's cues into a WAV a `<Sound>` plays, with the synth motionhub.dev gives reels. The skill gains a sound step and sound craft for films without narration, and the film format `oms install` puts beside it leaves narration out.
- **Why:** A trial of the skill drew two figure cards outside the frame and set a whole Chinese film in a fallback face, and `oms check` said nothing of either; it also had no way to make the sound effects a motion describes.
- **Breaking:** None. A check takes a little longer: it draws a frame for each line.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/desktop/src/main/film/review.ts`, `apps/desktop/src/shared/preview.ts`, `apps/desktop/src/main/film/effects.ts`, `apps/cli/oms.mjs`, `apps/cli/skills/oms/`, `docs/adr/0016-terminal-agents-author-films-through-the-oms-command.md`.

## 2026-11-22 — A mono sound exports as loud as the preview plays it

- **What:** An export puts a mono sound in both channels at its own level, as the preview's Web Audio plays it. ffmpeg's conversion to stereo had taken 3 dB off each channel, so mono music, effects and narration were quieter in the MP4 than in the preview.
- **Why:** What the person hears in the preview is what the MP4 holds.
- **Breaking:** A film with mono sounds or a synthesized narration, exported again, is 3 dB louder in those parts than its earlier export.
- **Upgrade:** Export again to match the preview; lower a mono sound's `volume` by 3 dB to keep an earlier export's balance.
- **Refs:** `apps/desktop/src/main/film/mix.ts`, `docs/adr/0017-an-export-is-encoded-in-segments-and-mixed-in-blocks.md`.

## 2026-11-22 — `oms` draws on demand, renders resume, and sounds mix in blocks

- **What:** On Linux, `oms` drives its headless Chrome frame by frame (`HeadlessExperimental.beginFrame`): a plain 20-second film renders in 7.7 s with one Chrome instead of 21.6 s, with the same frames. Every export, the Studio's and `oms render`'s, now encodes its picture in segments of 3,000 frames joined as they are, and mixes its sounds in JavaScript, 30 seconds at a time, instead of one ffmpeg filter graph: five minutes with 151 sounds mix in 1.0 s instead of 7.8 s, to the same sound within the AAC's own error. `oms render` keeps its finished segments in `~/.cache/oms/renders` until the video is whole, so the same render started again after Ctrl-C or a crash draws only what is missing; Ctrl-C now stops a render cleanly.
- **Why:** VisoTalk's exporter, which oms takes over from, works this way; long renders on servers need to survive an interruption.
- **Breaking:** None. A sound under the narration is now ducked sample by sample, by the curve the preview plays, instead of once an audio frame.
- **Upgrade:** Nothing. `oms` may keep up to a week of an unfinished render's segments in `~/.cache/oms/renders`.
- **Refs:** `apps/desktop/src/main/film/capture.ts`, `apps/desktop/src/main/film/mix.ts`, `apps/cli/chrome.ts`, `apps/cli/worker.ts`, `apps/cli/oms.mjs`, `docs/adr/0017-an-export-is-encoded-in-segments-and-mixed-in-blocks.md`, `docs/adr/0010-a-films-sound-is-sound-elements-mixed-on-export.md`.

## 2026-11-22 — The OMS skill carries VisoTalk's craft, and both agents get three more rules

- **What:** `oms install` now puts five references beside the skill (`craft.md`, `look.md`, `drawing.md`, `review.md`, `assets.md`) and the example film, and the skill gives an order of work: facts and script, a board per scene, the look, one scene drawn and looked at before the rest, at most three review rounds, then the render. They carry VisoTalk's tuned guidance on scripting to length, motion that means something, pacing, the cover frame, type and colour, portrait films, honest figures, licences and an independent reviewer, rewritten for `film.tsx`. The film format, which the Studio's agent reads too, adds three rules: name layers for what they show; a scene's picture is there from its first frame, eased, entering over half a second and holding before its end; four or five type sizes, clear of the caption.
- **Why:** VisoTalk is retiring in favour of OMS; its skill text was tuned on many films.
- **Breaking:** None.
- **Upgrade:** Move the installed `skills/oms` folder aside and run `oms install claude` or `oms install codex` again.
- **Refs:** `apps/cli/skills/oms/`, `apps/cli/example/film.tsx`, `apps/cli/oms.mjs`, `apps/desktop/src/main/film/film.md`.

## 2026-11-22 — Exports are faster, and `oms render` draws with several Chromes

- **What:** Each exported frame costs one round trip to the page instead of four, is passed to ffmpeg as the PNG DevTools made instead of decoded and encoded again, and no longer waits two animation frames after a seek: a plain film exports about a quarter faster in the Studio and with `oms`. `oms render` also draws with several Chromes at once, one a core as memory allows: on four cores a plain 20-second film rendered in 9 s instead of 28 s, and a heavily blurred one in 19 s instead of 51 s (Linux, no GPU). The same film renders to the same frames however many Chromes draw it.
- **Why:** VisoTalk's exporter, which oms takes over from, renders in parallel; most of a frame's cost in a plain film was waiting, not drawing.
- **Breaking:** None. Frames from `oms` are rastered whole, so a film with fine anti-aliased motion may differ from an earlier render by invisible amounts (PSNR above 58 dB in the films measured).
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/film/capture.ts`, `apps/desktop/src/main/film/stage.ts`, `apps/desktop/src/shared/preview.ts`, `apps/desktop/src/preview/core.tsx`, `apps/cli/chrome.ts`, `apps/cli/worker.ts`, `docs/adr/0016-terminal-agents-author-films-through-the-oms-command.md`.

## 2026-11-22 — Every still and exported frame is the frame at its time, and three.js films draw without a GPU

- **What:** Stills, the timeline's frames, checks and MP4 exports photograph each frame through DevTools' screenshot instead of the offscreen window's last painted frame. A film heavy to draw (large blurs, backdrop filters, many blended layers) was photographed a frame behind, or at the previous seek's time, and could fail with `UnknownVizError` on its first frame. The Studio and `oms` also let Chromium draw WebGL with SwiftShader where no GPU can, so a three.js film no longer fails to start on a virtual machine, in CI or over a remote desktop.
- **Why:** An export must show what the timeline shows at each time.
- **Breaking:** None. An export takes longer per frame: about 40 ms more for a plain 540×960 film and about 80 ms more for a 1080p three.js film in software rendering, measured on Linux without a GPU.
- **Upgrade:** Nothing. Export a heavy film again to replace one made before.
- **Refs:** `apps/desktop/src/main/film/stage.ts`, `apps/desktop/src/main/index.ts`, `apps/cli/worker.ts`, `apps/cli/scripts/test-installed.mjs`, `docs/tech/architecture.md`, `docs/tech/creator-workflow.md`.

## 2026-11-22 — Claude Code and Codex make films end to end with `oms`

- **What:** A new package, `apps/cli` (`@motionhub/oms`), holds the `oms` command and an OMS skill for Claude Code and Codex, which make a film end to end. `oms install claude` or `oms install codex` puts the skill in the host's user skills directory; `oms init`, `oms check [--json]`, `oms still --at <s> --out <new.png>` and `oms render --out <new.mp4>` start, check, draw and render a film (the MP4 with the person's own ffmpeg), and `oms motion search` and `oms motion use` take a motion from motionhub into it when a film asks for one with the Studio's own build and preview core, in the chrome-headless-shell build HyperFrames pins: one HyperFrames or Puppeteer already downloaded, else downloaded once into `~/.cache/puppeteer`. It needs no display, and runs Chrome without its sandbox, with a warning, as root or in a container. The folder opens in the Studio as it is. The package is built with `npm pack` and is not published yet.
- **Why:** People who already work in a terminal agent can make a film there, then refine and export it in the Studio.
- **Breaking:** None.
- **Upgrade:** Nothing. To use it, follow `apps/cli/README.md`.
- **Refs:** `apps/cli/`, `apps/desktop/scripts/build-cli.mjs`, `apps/desktop/src/main/film/stage.ts`, `apps/desktop/src/main/film/film.ts`, `docs/adr/0016-terminal-agents-author-films-through-the-oms-command.md`, `docs/tech/architecture.md`, `README.md`.

## 2026-11-22 — The website moves out of this repository

- **What:** openmotion.studio's pages, media, Worker and deploy, with the docs on its design and its examples, are now kept in the private `motionhubdev/openmotionstudio-web`, and their history is taken out of this one; this repository holds the Studio alone. `pnpm dev:site` is gone. Publishing a release here now sends it to the website (`.github/workflows/site.yml`), which points its downloads at it and deploys.
- **Why:** The open repository is for the Studio's code; the website's films made every clone hundreds of megabytes heavier.
- **Breaking:** The history was rewritten: every commit and tag has a new id, and a clone made before this has to be cloned again (or reset onto the new `main`). The releases and their downloads are unchanged.
- **Upgrade:** Clone again. A release needs the `WEBSITE_DISPATCH_TOKEN` secret to reach the website.
- **Refs:** `.github/workflows/site.yml`, `package.json`, `README.md`, `CLAUDE.md`, `docs/design.md`, `docs/tech/architecture.md`, `docs/README.md`.

## 2026-11-22 — The narrated explainers on /examples no longer name the tool they were made with

- **What:** The 23 narrated explainers on /examples show the films alone: their head ("More films"), cards, buttons ("Download source") and labels, in English and Chinese, no longer name the tool they were made with. Each card still links its original and credits others' media; the head says their source was made with another engine and does not open in the Studio, and links the licence and credits. Every file and address is unchanged.
- **Why:** The page shows the work, not the tool behind it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/examples.html`, `site/studio.css`, `docs/prd/examples.md`, `docs/design.md`.

## 2026-11-22 — /examples shows twenty-three narrated explainers made with VisoTalk

- **What:** Under "Made with VisoTalk", /examples shows 23 of VisoTalk's examples as visotalk.dev rendered them, each with its narration, a link to the original and its VisoTalk source to download (the document, its parts, media, voice and captions; it opens in VisoTalk): Liftoff, the Roadster's wind tunnel, UTMB, How a Chip Is Made, the Moon's phases, photosynthesis, the sky's colours, from URL to page, the HTTPS handshake, Fourier, the eight billion, uv, an incident review, Nook Notes, Quiet Hours, a clock's escapement, the North Wind and the Sun, 守株待兔, Sonnet 18, the Shinkansen, Japan's population, hiccups in Korean and seven probability distributions. Five made in Chinese as well play, show and offer the Chinese cut on the Chinese page. Media by others are credited on their cards and in each bundle's credits.md; the source's MIT notice is beside the files.
- **Why:** VisoTalk's examples were the best narrated films the team had made, and the examples page is where people look for what can be made.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/examples.html`, `site/studio.js`, `site/studio.css`, `site/media/visotalk/`, `docs/prd/examples.md`, `docs/design.md`.

## 2026-11-21 — Three new examples: a motion study, a data story and an explainer

- **What:** /examples shows three more films, each with its source to open in the Studio and the post on X that inspired it: Signal, a 15-second motion study of a radar sweep; Eight billion, 25 seconds of world population on the United Nations' figures; and Four steps, a 17-second explainer in kinetic type of describing, pointing, changing and exporting a film.
- **Why:** Two films with tutorials did not show the range of what the Studio makes; these are the first made the way the planned daily agent will make them.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/examples.html`, `site/studio.css`, `site/media/signal*`, `site/media/eight-billion*`, `site/media/four-steps*`, `docs/prd/examples.md`, `docs/design.md`.

## 2026-11-21 — openmotion.studio/tour becomes /examples, a wall of films made in the Studio

- **What:** The tutorials' list is now the examples: each card shows its finished film first, at a frame of the film itself, and plays it in place, with buttons for how it was made (the tutorial and its length) and its files (The Hollow Mountain's source; Ember's photos and prompts). The tutorials moved to /examples/launch-film and /examples/hollow-mountain, and the top bar, footer and README say Examples.
- **Why:** The site is to show many films made in the Studio, most of them without a recorded tutorial; a list of tutorials could not hold them. The plan for the rest, including a daily agent that makes new examples, is `docs/prd/examples.md`.
- **Breaking:** None. /tour and /tour/<name> are sent on to /examples and /examples/<name> for good (301), the query kept.
- **Upgrade:** Nothing.
- **Refs:** `site/examples.html`, `site/examples/`, `site/worker.js`, `site/studio.js`, `site/studio.css`, `site/index.html`, `site/media/launch-film.webp`, `site/media/crater-film.webp`, `README.md`, `docs/prd/examples.md`, `docs/README.md`, `docs/design.md`, `docs/tech/architecture.md`.

## 2026-11-21 — The Studio takes the website's colours, and cobalt shows where attention is

- **What:** The Studio's paper and ink are now the website's: a cleaner, less yellow ground in light (`#F3F1EC` under `#FCFCFA` panels) and a step deeper in dark (`#0F0D0B` under `#1A1714`). Buttons are raised as on the website, and Export MP4 has Download's vermilion edge and glow. Cobalt, until now only for marks and selection, also shows what is running or playing (the agent's current phase, a task's progress on Home, Pick and Region while on, a template's play button), the keyboard's focus as a 2 px ring, and the second phrase of Home's and the first run's headline, as on the website. Failures are a rose red, no longer the vermilion of the mark and Export.
- **Why:** The website and the app used the same two accents differently and sat on different papers, so the app looked unlike its own pictures on the site; focus was a 1 px grey ring that was hard to see; and a failed build read in the brand's colour.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/styles.css`, `apps/desktop/src/renderer/src/home.tsx`, `apps/desktop/src/shared/translations.ts`, `docs/design.md`, `site/studio.css`.

## 2026-11-21 — The front page names what the Studio is, and its demo plays with music

- **What:** Over the first screen's headline, the Studio is named for what it is: "The open-source motion studio for your own AI" (in Chinese too). The demo under it now opens and closes on the Studio's name and that line, and plays with music (Cat Walk by Arulo, under the Mixkit free licence), cut so the new version arrives on the track's drop; its four steps keep their places in the longer film.
- **Why:** The first screen said what the Studio does but not what it is, and the demo played in silence, which made it read as a recording rather than a film.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/index.html`, `site/studio.js`, `site/media/studio-loop.mp4`.

## 2026-11-21 — openmotion.studio/tour lists tutorials, starting with a launch film made start to finish

- **What:** /tour is now a list of tutorials, each a card with its poster, length, level and what it teaches. The first is new: a 4-minute recording of one real session, in which a paragraph, the Stage Light look from MotionHub and two product photos become a narrated 30-second launch film for a desk lamp. It shows describing the film at Home, adding a look, importing photos, connecting Claude Code, two regions marked on the picture and the change they make side by side, a voice from the person's own provider, trying a version and going back to before it, and the export. Every wait for the agent or the export is shown sped up with its real length. It is narrated in English and in Chinese (the page's language picks the voice and the captions), with the prompts to copy and a practice pack of the photos and prompts. The Hollow Mountain workshop moved to /tour/hollow-mountain, and the front page's link under the demo opens the new tutorial.
- **Why:** The only walkthrough was an advanced terrain project cut from fragments; it did not show most of what the Studio does, or a whole film being made.
- **Breaking:** None. /tour still answers, now with the list; the workshop's old address is the list's second card.
- **Upgrade:** Nothing.
- **Refs:** `site/tour.html`, `site/tour/launch-film.html`, `site/tour/hollow-mountain.html`, `site/studio.css`, `site/studio.js`, `site/index.html`, `README.md`, `docs/design.md`, `docs/tech/architecture.md`.

## 2026-11-21 — Export names the narration in a narrated film's sound

- **What:** The export dialog says a narrated film's MP4 carries its narration ("AAC sound: the narration", with any other sounds counted beside it) instead of "picture only". The export already mixed the voiced lines in; only the label was wrong.
- **Why:** A film whose every line was voiced was announced as picture only, which reads as the voice being lost.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/export-dialog.tsx`, `apps/desktop/src/shared/translations.ts`.

## 2026-11-20 — The website says what the Studio does, in plain words

- **What:** The front page and the walkthrough are rewritten for people who make video but not animation: each section answers one question a visitor has (what it is, will it look good, can I change one thing, what does it cost and where do my files go, how is it different, how do I start), in words they use (AI, video, style, circle, export) instead of the Studio's own (agent, film, look, reel, brief). The Chinese is written as Chinese, not translated line by line. The chapters on the transport bar are named the same way. The first screen asks for one thing, Download, with the full walkthrough linked under the demo at its right; the cost and privacy section sets its headline at the left beside the list. The top bar and the footer link the community on Discord, the footer with GitHub's and Discord's marks. On a desktop the walkthrough is one screen, its film as large as the screen allows and playable full screen, its steps beside it as tall as the film and scrolling within.
- **Why:** The page spoke in metaphors and the Studio's vocabulary; a visitor could finish it without knowing what the app does or whether it is free.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/index.html`, `site/tour.html`, `site/studio.css`, `docs/design.md`.

## 2026-11-20 — The Studio downloads its updates and installs them on restart

- **What:** A packaged Studio checks GitHub for a stable release after it starts and every six hours (the automatic-check preference and Check for updates stay in Settings → General), downloads an eligible update in the background, and offers Restart to update or Later. A restart waits until no project has an active task or an unsent draft. On a Mac the update is verified and staged by the system's own updater, from a Developer ID signed, notarized build only. Releases carry update manifests and block maps, assembled and checked against the draft's files before it is touched.
- **Why:** Updating meant downloading and installing each release by hand.
- **Breaking:** None.
- **Upgrade:** Install the first release with the updater once by hand from openmotion.studio; later releases arrive in the app. Updates install only on builds the updater can verify.
- **Refs:** `apps/desktop/src/main/updates.ts`, `apps/desktop/src/main/installer-update.ts`, `apps/desktop/src/main/index.ts`, `apps/desktop/src/renderer/src/updates.tsx`, `apps/desktop/scripts/assemble-updates.rb`, `.github/workflows/build.yml`, `apps/desktop/electron-builder.yml`, `docs/tech/desktop-updates.md`.

## 2026-11-20 — The website shows five MotionHub looks, under MotionHub's logo

- **What:** The front page's Looks section names its source with MotionHub's own logo and lists five looks by SuoSi: Clay World, Pixel Quest, Ink Scroll, Stage Light and Riso Pop, each to be shown in its own reel exported by the Studio, with a mark for each look down the reel's right side; until a reel is there, a slate names the look. The footer links MotionHub with its icon. The earlier films of one brief in three looks are gone, and the README shows the five looks' posters from MotionHub.
- **Why:** The section should show what looks can do at their most striking, and say plainly where they come from.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/index.html`, `site/studio.js`, `site/studio.css`, `site/media/`, `README.md`.

## 2026-11-20 — Looks drawn in real 3D build in the Studio

- **What:** A film that uses a look drawn with three.js (such as Clay World on MotionHub) builds, plays and exports: the Studio bundles its own three.js 0.187.0, the version motionhub's player uses, with its addons. The agent is told it is there, and a Remotion export pins the same version.
- **Why:** motionhub's spec lets a look's components import three.js, but the Studio provided only React and the runtime, and runs no package installer, so such a film could not build.
- **Breaking:** None. A project's own `node_modules/three` is no longer used for its film; the Studio's copy is.
- **Upgrade:** Nothing. It arrives with the next release.
- **Refs:** `apps/desktop/src/main/film/film.ts`, `apps/desktop/src/main/film/film.md`, `apps/desktop/src/main/film/remotion-export.ts`, `apps/desktop/electron-builder.yml`, `apps/desktop/package.json`, `docs/tech/architecture.md`.

## 2026-11-20 — The website's controls are one family

- **What:** The website's buttons, toggles, links and selects follow one set of components, after the Studio's own: raised buttons in three sizes with Download alone in vermilion; the language as on the Studio's Home, its icon and short name opening the languages by their own names, so more can follow; the theme (light, dark) as a segmented control that shows both choices; selects drawn by the page, their lists included, instead of the system; the pages in the top bar marked by an ink bar under the current one; a frosted top bar that takes an edge once the page scrolls; and a transport bar at the foot whose progress is a tinted band and whose chapters are named in the page's language. The first screen's demo no longer plays by itself or loops: it waits at its first frame with a play button, a click on it plays or pauses it, and it returns to its first frame when it ends; a click on the walkthrough's picture plays it too. The downloads, the first screen and the tour use the same buttons.
- **Why:** The top bar's controls read as generic framework widgets; a studio for visual work should look made by one.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/studio.css`, `site/studio.js`, `site/index.html`, `site/tour.html`, `docs/design.md`.

## 2026-11-20 — The website reads in Chinese, and the tour has its own page

- **What:** openmotion.studio reads in English or Chinese: the language menu in the top bar switches every word on the page, kept in the browser; a browser set to Chinese opens in Chinese, and `?lang=zh` or `?lang=en` picks one for a link. The 90-second tour moved from the front page to its own page, openmotion.studio/tour, with each of its six steps written out beside the film, lit as it plays and jumping to its place; its captions follow the page's language. The first screen links to it under the app's loop.
- **Why:** Many of the Studio's people read Chinese first; and a tour is easier to follow with its steps written down than as one more section of the front page.
- **Breaking:** None. A link to `/#tour` is sent on to `/tour`.
- **Upgrade:** Nothing.
- **Refs:** `site/index.html`, `site/tour.html`, `site/studio.js`, `site/studio.css`, `README.md`, `docs/tech/architecture.md`.

## 2026-11-19 — OpenMotionStudio v0.1.3

- **What:** A release that looks for updates at the repository's new address, `motionhubdev/openmotionstudio`, sends a failed update to openmotion.studio, and sets the name on Home in two weights. Installers for macOS (Apple silicon and Intel), Windows (x64) and Linux (x64 and ARM64 AppImages) are on GitHub Releases.
- **Why:** v0.1.0 to v0.1.2 find updates only through GitHub's redirect from the old address, which ends if anyone registers `motionhub-dev`; v0.1.2 announces this release to them while it still works.
- **Breaking:** None.
- **Upgrade:** Install v0.1.3 over v0.1.2. The Windows installer stays unsigned until SignPath is set up.
- **Refs:** `apps/desktop/package.json`, `apps/desktop/src/main/updates.ts`.

## 2026-11-19 — The repository is motionhubdev/openmotionstudio

- **What:** The repository moved from `motionhub-dev/open-motion-studio` to `motionhubdev/openmotionstudio`, and motionhub's from `motionhub-dev/motionhub` to `motionhubdev/motionhub`. The app now looks for updates at the new address, and the website, the README and the documents link there. Installers keep their file names.
- **Why:** The organisation was renamed to `motionhubdev` and the repository to the product's one-word name.
- **Breaking:** None while GitHub redirects the old addresses. v0.1.0 to v0.1.2 look for updates at the old address, which works only through that redirect; it ends if anyone registers `motionhub-dev`.
- **Upgrade:** Point a clone at the new address: `git remote set-url origin https://github.com/motionhubdev/openmotionstudio`. Install the next release to look for updates at the new address.
- **Refs:** `apps/desktop/src/main/updates.ts`, `site/index.html`, `README.md`.

## 2026-11-19 — The name is set in two weights

- **What:** Beside the mark, on the website's top bar and footer and on Home in the app, the name reads **OpenMotion** in weight and Studio in a regular, muted weight, as the address openmotion.studio splits it. In running text the name stays OpenMotionStudio.
- **Why:** To tie the name to its address and make it easier to read at a glance.
- **Breaking:** None.
- **Upgrade:** Nothing. The app shows it from its next release.
- **Refs:** `apps/desktop/src/renderer/src/logo.tsx`, `site/index.html`, `docs/design.md`.

## 2026-11-19 — The website moves to openmotion.studio

- **What:** The introduction page is served at openmotion.studio. studio.motionhub.dev and www.openmotion.studio answer with a permanent redirect to the same page there, path, query and `#` kept. The Studio's update notice now sends people to openmotion.studio to download an update.
- **Why:** The Studio has its own name and now its own address.
- **Breaking:** None. Links to studio.motionhub.dev, including the update notice in v0.1.0 to v0.1.2, keep working through the redirect.
- **Upgrade:** Nothing.
- **Refs:** `site/wrangler.jsonc`, `site/worker.js`, `apps/desktop/src/main/updates.ts`, `README.md`.

## 2026-11-19 — OpenMotionStudio v0.1.2

- **What:** A release with the Studio's own mark, the eased square, as the app's icon, window and tray icon and Home's logo, and with Windows releases set up to be signed through SignPath Foundation. Installers for macOS (Apple silicon and Intel), Windows (x64) and Linux (x64 and ARM64 AppImages) are on GitHub Releases.
- **Why:** To bring the Studio's new face to the people who use it; v0.1.1 announces it to them as an update.
- **Breaking:** None.
- **Upgrade:** Install v0.1.2 over v0.1.1. A pinned shortcut may keep the old icon until the system refreshes its icon cache. The Windows installer stays unsigned until SignPath is set up.
- **Refs:** `apps/desktop/package.json`, `README.md`.

## 2026-11-19 — The website's first film is re-shot, its films can be seeked, and it is light by default

- **What:** The first screen's loop is a new take of the real Studio: the bars of the "A story in numbers" template are marked with a note, Claude Code makes the tallest one vermilion and the bars rise one after another, its steps shown sped up, and the new cut is pushed in on. Its four steps jump to their place, as the tour's chapters do: a small Worker script (`site/worker.js`) answers byte ranges of the films, which static assets alone did not, so a browser played them from the start. The page is light by default, with a theme toggle in the top bar kept in the browser; GitHub has its mark there. The first screen's Download gives the installer for the visitor's system straight away and names it, with the way to the others; each system has its icon there and in the downloads, and the agents named on the first screen have their makers' marks. The shoot is scripted in `apps/desktop/scripts/shoot/` (Xvfb, ffmpeg, the real pointer through XTest, and `cut.py`).
- **Why:** The first screen has to show a change one can see at a glance; a step or a chapter that played from the start was a broken promise; an open studio reads better in daylight; a download should not need a scroll.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/`, `apps/desktop/scripts/shoot/`, `docs/tech/architecture.md`.

## 2026-11-19 — Windows releases are signed through SignPath Foundation

- **What:** A Windows release built by CI (a `v*` tag, or a run that prepares a draft release) sends its program and then its installer to SignPath, which signs both with SignPath Foundation's certificate once an approver accepts; CI stops unless both carry a valid signature. The `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` secrets are gone, replaced by the `SIGNPATH_API_TOKEN` secret and the `SIGNPATH_ORGANIZATION_ID` variable. The code signing policy, team roles and privacy statement are in `docs/ops/code-signing.md`, linked from the README and from the download section of studio.motionhub.dev.
- **Why:** A code-signing certificate's key now has to live in hardware, so a `.pfx` in a secret can no longer be had; SignPath Foundation signs open-source releases for free, from CI only.
- **Breaking:** None.
- **Upgrade:** Nothing. Builds stay unsigned until the SignPath settings are set; pushes and pull requests are never signed.
- **Refs:** `.github/workflows/build.yml`, `apps/desktop/scripts/check-signing.mjs`, `docs/ops/code-signing.md`, `site/index.html`.

## 2026-11-18 — The Studio has its own mark

- **What:** The app's icon, its window and tray icon and Home's logo are the Studio's own mark, the eased square: a rounded square split by an ease-in-out curve into deep and mid vermilion, in place of motionhub's two balls. Export stays vermilion, in the mark's colour, and marks on the picture stay cobalt.
- **Why:** The Studio needs a face of its own beside the catalogue's.
- **Breaking:** None.
- **Upgrade:** Nothing. A new install shows the new icon; a pinned shortcut may keep the old one until the system refreshes its icon cache.
- **Refs:** `apps/desktop/resources/icon.svg`, `icon.png`, `icon.ico`, `docs/design.md`.

## 2026-11-18 — The website shows the real Studio

- **What:** studio.motionhub.dev is rebuilt as one film in a dark screening room, with a transport bar at the foot carrying the timecode and the scenes. Its first screen says what the Studio is beside a 24-second loop of the real app (brief, build, mark the frame, edit, compare) whose five steps light as it plays. Then a 93-second tour of one real project with chapters and English and Chinese captions; one brief made in the Studio with three MotionHub looks (Riso Pop, Stage Light, Night Diagram, by SuoSi); the real first and revised cuts at the same instant; what the person owns, told as end credits; and the Studio beside generative video, Remotion and HyperFrames in three sentences. The page wears the Studio's eased-square mark.
- **Why:** Creators decide on what they see: the first screen has to show the app doing the work.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `site/index.html`, `site/studio.css`, `site/studio.js`, `site/favicon.svg`, `site/media/`.

## 2026-11-18 — Check for Studio updates (v0.1.1)

- **What:** General settings shows the installed version and checks GitHub for newer stable releases. Installed apps also check in the background unless the preference is switched off. A dismissible notice opens the official download page.
- **Why:** Creators can find a new desktop release while their project continues running.
- **Breaking:** None.
- **Upgrade:** Install a desktop build containing this change to see the new controls.
- **Refs:** `apps/desktop/src/main/updates.ts`, `apps/desktop/src/renderer/src/updates.tsx`.

## 2026-11-18 — First desktop release (v0.1.0)

- **What:** OpenMotionStudio packages the editor for macOS (Apple silicon and Intel), Windows (x64) and Linux (x64 and arm64).
- **Why:** People can start from a sample film, use a motion from motionhub, direct edits on the preview and export an MP4 from the installed app.
- **Breaking:** None.
- **Upgrade:** First install. Choose the download for your operating system and processor.
- **Refs:** `apps/desktop/package.json`, `apps/desktop/electron-builder.yml`, `.github/workflows/build.yml`.

## 2026-11-18 — The timeline folds while code is read

- **What:** Opening a file in the code view folds the timeline to its head, and leaving the code view opens it again,
  unless it was folded before.
- **Why:** Code is read line by line down the page; the timeline took a third of its height and showed nothing of it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-18 — Past conversations are kept; History is Versions

- **What:** New conversation keeps the one before in the project's `.motion-studio/conversations/` (as it was shown,
  without stills), and the assistant's clock opens Past conversations: those kept, newest first, each read as it was.
  The turns' checkpoints the clock used to open are now Versions, opened from the project's title menu.
- **Why:** The clock beside New conversation read as the conversation's history but showed the film's checkpoints, and
  New conversation threw the conversation away with no way back to it.
- **Breaking:** None. A conversation cleared before this is not recovered.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/conversations.ts`, `apps/desktop/src/renderer/src/past-conversations.tsx`,
  `apps/desktop/src/renderer/src/project-view.tsx` (`ProjectMenu`).

## 2026-11-18 — The film's voice is chosen and heard in the voice view

- **What:** The voice view lists the voices of each provider set up, searched by name, language or id; each is heard
  saying the film's own first line, and Use this voice has the agent give the film that voice and speak its lines
  again. Only keys and new providers are left to Settings. Every line voiced shows once, not as a disabled button too.
- **Why:** Choosing a voice meant leaving the film for Settings and back, and hearing it say a sentence the film never
  says.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/voice-view.tsx` (`VoicePicker`).

## 2026-11-18 — Voice is a view of its own

- **What:** Voice (配音) opens across the workspace beside the assistant, as the motion library does, instead of in
  the side panel: the script read straight through, a card for each scene with Play this scene and a row for each
  line in large type, played in place, added to the message with @, and lit while it is said; at the right, what the
  voice still needs, or the voice and voicing the lines waiting. The script shows while the voice is being set up.
- **Why:** In the side panel the script was a narrow list, and it was hidden until a voice could speak.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/voice-view.tsx` (replacing `voice-panel.tsx`), `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-18 — The motion library is a view of its own

- **What:** Motions (动效库) opens across the workspace beside the assistant, in place of the stage, the timeline and
  the project tools, instead of in the side panel: a search and tag chips over a grid of large posters (a poster
  pointed at plays its reel), the project's motions first, and a drawer for the motion opened, with its reel, what it
  is for, its colours, components and MOTION.md and its actions. Picture or Esc go back; applying a motion goes back
  to the picture to show the restyle.
- **Why:** In the side panel a motion could only be seen one poster and one dialog at a time.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/motion-library.tsx` (replacing `motion-panel.tsx`),
  `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-17 — Settings are in Home's sidebar

- **What:** Home's sidebar lists Settings' sections (General, Model Providers, Coding Agents, Voice Services,
  Diagnostics) at its foot, apart from the pages of work above, and each opens as one of Home's pages instead of a
  page over Home. The workspace folder is part of General, in the editor's Settings too. Home's header gear and the workspace row at the sidebar's foot are gone. Settings opened from a
  setup step or Ctrl/⌘ , has a back arrow to where the person was; leaving with unsaved edits asks first. In the
  editor Settings is still a page of its own.
- **Why:** Home's sidebar held three rows and a wide gap, and Settings covered Home with a second sidebar of its own.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/home.tsx`, `apps/desktop/src/renderer/src/settings.tsx` (`embedded`),
  `apps/desktop/src/renderer/src/app.tsx`.

## 2026-11-17 — The motion library opens from the top bar

- **What:** Motions (动效库) is a button in the editor's top bar beside Voice, with how many motions the project holds,
  and opens its panel in the project tools as Voice does, with a back arrow and its title. Its tab is gone: the
  project tools are Outline, Assets and Code.
- **Why:** Applying a motion restyles the whole video, as voicing it speaks the whole video; it was the third of four
  tabs, where few found it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-17 — A read-only code view

- **What:** A Code tab lists the project's files; a code file opens across the stage in place of the picture,
  read-only, with line numbers and its syntax coloured, Copy and Open in your editor. A scene, layer or line of the
  outline shows the lines of film.tsx that write it, and lines selected go with the next message as a reference
  (`film.tsx:3-5`, with their text). The assistant stays beside it.
- **Why:** The film is code the agent writes, and there was no way to read it, or point at a part of it, without
  leaving the Studio.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/code-view.tsx`, `apps/desktop/src/main/files.ts`, `apps/desktop/src/shared/spans.ts`;
  `sugar-high` 2.6.0 (a dev dependency, bundled into the renderer).

## 2026-11-17 — Assets are renamed, trashed and kept current

- **What:** A file the video does not use is renamed (its extension kept) or moved to the system's trash from its
  dialog in Assets; one it uses says why it cannot be. Assets say how many files the video leaves out, with Show only
  these. The list is read again when the window comes back into focus or the film is rebuilt, and its refresh button
  is gone.
- **Why:** A file once imported could only be renamed or cleared away in the file manager, and the list showed what
  was there only after a press of refresh.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/assets.ts` (`renameAsset`, `trashAsset`), `apps/desktop/src/renderer/src/assets-panel.tsx`.

## 2026-11-17 — Assets and motions are reached from the composer and by dropping files

- **What:** The composer's + opens Import files…, From the assets and From the motion library. Files from the
  computer dropped anywhere on the workspace are imported into `media/` and go with the next message. The Assets and
  Motions tabs say how many they hold, and Start from a look opens the motion library.
- **Why:** Both panels sat behind the Outline with nothing in the way of making a film leading to them.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/assistant.tsx`, `apps/desktop/src/renderer/src/project-view.tsx`,
  `apps/desktop/src/preload/index.ts` (`importDroppedAssets`).

## 2026-11-17 — Motions are applied to the video, and assets dragged where they go

- **What:** The Motions panel (动效库 in Chinese) opens on motionhub's whole catalogue instead of an empty search, and
  a motion is applied to the video: it is taken into the project if needed and the agent is asked, after a
  confirmation, to restyle the film with it, keeping the film's words, scenes and timing. The project's motions are
  marked in use or not, preview their reel, and one from the hub the film does not use can be removed (its folder
  and its line in `motions.lock.json`). Assets are dragged onto the picture (a mark there asking for the file) or
  onto the composer; a sound plays in place with its length, a typeface shows itself, and a file the film uses is
  marked In use. The Chinese tray now says 一个区域 for a region.
- **Why:** Use and Import only copied files into the project, so nothing on screen changed, and the catalogue showed
  nothing until someone guessed a word to search for.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/motion-panel.tsx`, `apps/desktop/src/renderer/src/assets-panel.tsx`,
  `apps/desktop/src/main/motions.ts` (`removeMotion`), `apps/desktop/src/main/project.ts` (`projectSource`).

## 2026-11-17 — Home's covers are sharp and whole

- **What:** A project's cover is kept with its long side at 1280 px (it was 640 px wide) and drawn whole on the stage's
  dark: a portrait or square film shows its full frame instead of a cropped, enlarged middle. A cover taken smaller
  before is taken again the next time the project is opened.
- **Why:** On a high-density screen Home's large card enlarged a 640 px cover about twice, and a portrait film's
  cover was cropped to its middle third and enlarged again, so it looked blurred.
- **Breaking:** None.
- **Upgrade:** Nothing: a project opened once has its new cover.
- **Refs:** `apps/desktop/src/main/film/capture.ts` (`COVER_SIDE`, `jpegSize`), `apps/desktop/src/renderer/src/styles.css`
  (`.project-art`).

## 2026-11-17 — Home's header switches the theme and the language

- **What:** Home's header has the language as 中文 or EN and the theme as one icon (a moon in light, a sun in dark),
  each switching to the other at a click and saved as the preference Settings holds; Follow system stays in Settings.
  Its New video button is removed: the prompt below it, a template and Ctrl/⌘ N make one. Open project moves into the
  prompt, beside Start creating.
- **Why:** The look and the language were three clicks away, and New video said twice what Home's prompt is for.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/home.tsx` (`Home`).

## 2026-11-17 — The Chinese interface says 视频, not 影片

- **What:** Every Chinese label, message and hint that named the film (`film.tsx`) as 影片 names it 视频, counted with
  个 (这个视频, 第一个视频): 新建视频, 导出视频, 视频预览 and the rest. The English is unchanged.
- **Why:** 影片 reads as a cinema film; what people make here are videos, and 视频 is the word they use for them.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/shared/translations.ts`, `docs/design.md`.

## 2026-11-17 — A film made without a name is film-<id>

- **What:** New film, and a film whose brief leaves no usable name, makes its folder `film-` and six random letters and
  digits (`film-k3x9q2`) instead of `Untitled film`, `Untitled film 2`, …; a taken one is drawn again. Names given
  (a brief's first line, a template's name, a copy) are kept as they were, numbered when taken.
- **Why:** A folder name with a space has to be quoted in a shell and escaped in a URL, and numbered untitled films
  said nothing a random ID does not.
- **Breaking:** None. Existing projects keep their folders.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/main/project.ts` (`newFilmName`, `createInWorkspace`).

## 2026-11-17 — The outline's row actions say what they do

- **What:** A row's actions in the outline sit on the row in its colour, muted until pointed at, instead of in a
  floating box with a shadow. Adding a row to the message is @, as in the composer, instead of a speech bubble; playing
  a layer alone is ▷ in a square instead of stacked squares. They show on hover or keyboard focus, and no longer stay over a row's
  end after it is clicked, nor cover a selected row's outline.
- **Why:** The stacked squares read as copy and the bubble as a comment, and the box covered the row it acted on.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/outline.tsx`, `apps/desktop/src/renderer/src/styles.css` (`.row-actions`).

## 2026-11-17 — The film's size and frame rate are chosen on the stage

- **What:** The film's size and rate at the stage's foot open a menu of the usual sizes — landscape 16:9 (1920×1080,
  3840×2160, 1280×720), portrait 9:16 (1080×1920), portrait 4:5 (1080×1350) and square (1080×1080), each with where it
  is used — and the rates 24, 25, 30 and 60. A size and a rate chosen there change nothing until Change the film
  confirms them, under a line saying what will change and what the agent will do; then they go to the agent as one
  exact request: it changes
  `export const film` in film.tsx, keeps the scenes' lengths in seconds, scales a frame of the same shape and lays every
  scene out again for a new one. The menu waits while the agent is not ready or is working.
- **Why:** A film made for one platform often needs another's frame; the size was shown but could only be changed by
  describing it. The Studio still does not write film.tsx: a new shape needs the scenes laid out again,
  which is the agent's work.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/preview.tsx` (`SpecMenu`, `specRequest`).

## 2026-11-17 — The agent is chosen at the composer's foot

- **What:** The chip that chooses the project's agent and model moves from the assistant's head to the composer's foot,
  left of Send. Its menu opens upward, as wide as the composer. The project's tokens stay in the head, before History
  and New conversation.
- **Why:** Which agent a message goes to belongs beside the button that sends it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/assistant.tsx` (`AgentChip`), `apps/desktop/src/renderer/src/styles.css`.

## 2026-11-17 — The editor's bar has no Settings button

- **What:** The gear at the end of the editor's top bar is removed. OpenMotionStudio's settings open from Ctrl/⌘ , or
  from the Open Settings row of the keyboard shortcuts dialog, which is now a button; Home keeps its gear, and a model
  or a voice is still set up from the assistant's model menu and the Voice panel.
- **Why:** The settings it opened are the app's (theme, language, launch at login), not the film's; in the editor's bar
  it competed with Voice and Export MP4 for what the bar is about.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx` (`Shortcuts`).

## 2026-11-17 — A picked element's properties are changed on the picture; the Inspector is gone

- **What:** Picking an element on the picture opens its properties in the mark's sheet: its words (when it holds
  nothing else), size, weight, colour, fill and opacity. Each change shows on the picture at once; Apply sends it to the
  agent as exact changes to make in film.tsx (Add to message keeps it for the next message, Cancel puts the picture
  back). A mark carries the changes (`Mark.changes`), checked in the main process against the properties a mark can
  change. The Inspector tab, which only showed the element last picked, is removed; the project tools are Outline,
  Assets and Motions.
- **Why:** The Inspector showed what an element was but changed nothing, away from the picture. Trying a size or a
  colour where it is seen, then having the agent write it at its source, is the shorter way to the change.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/preview/pick.ts` (`oms:tweak`), `apps/desktop/src/renderer/src/preview.tsx` (`Stage`),
  `apps/desktop/src/main/agent/marks.ts`, `apps/desktop/src/shared/preview.ts` (`TWEAKABLE`).

## 2026-11-17 — Export MP4 is one split button

- **What:** The top bar's Export reads Export MP4 and is joined with the chevron beside it into one split button: the
  MP4 on its left, the other ways to export (a Remotion project) behind the chevron on its right.
- **Why:** The chevron sat apart in another style, so it did not read as part of exporting, and Export did not say what
  it makes.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx`, `apps/desktop/src/renderer/src/styles.css` (`.export`).

## 2026-11-17 — Keyboard shortcuts open from a question mark, in a wide dialog

- **What:** The top bar's keyboard shortcuts button is a question mark, the key that opens them, and the dialog is wide
  with its groups side by side in up to three columns instead of one tall list.
- **Why:** The keyboard icon did not say what it opened, and the tall list scrolled on a short window.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx` (`Shortcuts`), `apps/desktop/src/renderer/src/styles.css`.

## 2026-11-17 — Voice is a panel with every line

- **What:** Voice opens a panel in the project tools instead of a dialog. It shows the film's voice, its provider and
  how its captions show, with Voice settings and, when another voice is selected, a way to have the agent use it; every
  line by scene, voiced (with its length) or waiting, each played in place in the film; and, at its foot, voicing the
  lines waiting with how many characters that speaks, its progress and what it did. The setup steps (a provider, the
  film's voice) are the same, and the panel stays open while Settings sets a provider up.
- **Why:** The dialog said how many lines were spoken but not which, and could not play one; a modal dialog also hid
  the film while voicing it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/voice-panel.tsx`, `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-17 — The title menu is about the project alone

- **What:** The editor's title menu no longer lists other projects, Home or the film's size, rate and length; Show in
  folder moves to its foot with the folder's path written out, and every row has its icon (rename, duplicate, the
  window move, the folder).
- **Why:** Switching projects and going Home already have their place (the Home icon beside the title, and Home's
  library); in the project's own menu they made it long and mixed what is this project's with what is not.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx` (`ProjectMenu`), `apps/desktop/src/renderer/src/styles.css`.

## 2026-11-17 — The project's title menu holds what can be done to the project

- **What:** The editor's title menu now renames the project (also a double-click on the title), shows its folder,
  duplicates it as a new project beside it, and moves it to a window of its own or back to the main window, whichever
  applies; it shows the film's size, rate and length, the projects with a task running, the five opened last, and
  Home. The top bar's separate "Open in editor window" button is gone into that menu. The gear says it is
  OpenMotionStudio's settings and sits apart at the bar's end.
- **Why:** The pop-out icon read as a browser window, the menu offered both window moves at once, and a gear in a
  project's bar read as that project's settings.
- **Breaking:** Renaming a project renames its folder on disk.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx` (`ProjectMenu`), `apps/desktop/src/main/project.ts`
  (`renameProject`, `duplicateProject`, `folderName`), `apps/desktop/src/main/index.ts` (`renameKnown`).

## 2026-11-17 — Every timeline lane is drawn

- **What:** A film with more layers than the timeline is tall now draws every lane when the timeline is scrolled down.
  The tracks and the names column take the height of their lanes, at least the timeline's.
- **Why:** The tracks were as tall as the timeline's visible part, so scrolling down showed the names of the lower layers
  beside empty space.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/styles.css` (`.timeline .tracks`, `.timeline .names`).

## 2026-11-17 — A hidden panel leaves a rail

- **What:** Hiding the assistant or the project tools leaves a narrow rail in its place, its icon and name written down
  it, as the folded timeline leaves its head; clicking anywhere on the rail brings the panel back, and the whole folded
  timeline head unfolds it too. The assistant's rail shows a pulsing dot while the agent works. The top bar's buttons
  for hidden panels are gone; [ and ] still toggle them.
- **Why:** A hidden panel was only findable from two small icons in the top bar, far from where it had been.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx`, `apps/desktop/src/renderer/src/styles.css`.

## 2026-11-17 — A step's long command wraps inside the assistant

- **What:** A step of the agent's work that names a long path or command (a coding agent running
  `"C:\WINDOWS\System32\…\powershell.exe" -Command …`, say) wraps inside the assistant instead of running past its
  edge, and its icon stays by the first line. A step's output, the agent's words between its steps and its Markdown
  replies wrap an unbroken token the same way.
- **Why:** A path with no break in it set the step's width, and the assistant cut it off.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/styles.css` (`.tool summary`, `.markdown`).

## 2026-11-17 — Long names stay inside the workspace's panels

- **What:** Names that are longer than their place no longer run out of it or break badly. The chips under a finished
  turn end in an ellipsis inside the assistant, with the whole name on hover. A timeline lane named by a long layer
  id ends in an ellipsis instead of being cut mid-word. The stage's Pick, Region and Guides keep their words on one
  line instead of breaking a Chinese word per character. A reference card shows its scene's id as written rather than
  in capitals, and wraps a long path. The inspector's note flows as one sentence around its key.
- **Why:** A scene named by a long line pushed the turn's card past the assistant's edge, and the other panels had the
  same kind of break with long names or in Chinese.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/styles.css`, `apps/desktop/src/renderer/src/assistant.tsx`,
  `apps/desktop/src/renderer/src/inspector.tsx`.

## 2026-11-17 — A motion taken during a coding agent's turn is kept

- **What:** When Codex or Claude Code took a motion from motionhub through the Studio's tools during a turn, the end of
  the turn treated the new motion as the agent's edit and "put it back" to absent, deleting its files while the film
  still imported them (`Could not resolve "../motions/@…"`). The motion is now kept as taken; an agent's edits to any
  motion still go back.
- **Why:** It deleted a motion's files from the person's project and broke the film's build.
- **Breaking:** None.
- **Upgrade:** A project hit by it keeps the motion's empty folders and its `motions.lock.json` entry: delete the empty
  `motions/@<scope>/<slug>/` folder and take the motion again from the Motions panel, or ask the agent to.
- **Refs:** `apps/desktop/src/main/workspace.ts` (`outsideTurn`), `apps/desktop/src/main/__tests__/outside-turn.test.ts`.

## 2026-11-17 — Templates draw in their own face

- **What:** The templates set their type in Inter instead of the system's face: a template copy gets `media/Inter.woff2`
  and its licence (`media/Inter-OFL.txt`), and its film imports and declares the face. The preview and the export
  now load the faces a film declares itself before drawing any frame, not only its motions'. Home's template videos
  were rendered again in Inter.
- **Why:** A template looked different on every computer, and its preview video showed the face of the computer that
  rendered it.
- **Breaking:** None.
- **Upgrade:** Nothing. Template copies made before keep the system's face.
- **Refs:** `apps/desktop/src/main/examples.ts`, `apps/desktop/resources/fonts/`, `apps/desktop/src/preview/core.tsx`.

## 2026-11-16 — Templates play as the Studio renders them

- **What:** Home's template cards and template preview play a video of each template exported by the Studio itself,
  with its poster frame, instead of an HTML redrawing of it. `pnpm templates` renders them again after a template
  changes; a test fails until it has. The renderer's content policy allows media from the app itself.
- **Why:** The redrawing could drift from what the engine draws, so the preview could promise a film the template does
  not make.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/scripts/render-templates.mjs`, `apps/desktop/src/renderer/src/templates/`,
  `apps/desktop/src/main/__tests__/examples.test.ts`.

## 2026-11-16 — Home moves, and shows the tasks that need you

- **What:** Home's pages, an opened template, Settings and the editor come in with a short rise; cards lift and their
  covers lean in under the pointer; Home draws its shape while the library loads. A task over a project's cover shows
  a progress ring and a progress line while it runs, and a pulsing dot when it needs the person. The tray says how
  many tasks need the person and run, lists each project that needs them, and shows the count on the dock and beside
  the tray icon on a Mac; the tray is now in the interface's language. Reduced motion turns all of it off.
- **Why:** A visual tool should feel alive without moving the film, and a task waiting on the person in the
  background was easy to miss.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/home.tsx`, `apps/desktop/src/renderer/src/styles.css`,
  `apps/desktop/src/main/index.ts` (`showTasksInTray`).

## 2026-11-16 — Home starts a film from a description

- **What:** Home opens on a prompt: describe the film, and Start creating makes a project named from the description
  and sends it to the agent as the first message once the agent and the film are ready (it waits in the composer
  without an assistant). The project opened last is a large card with Continue editing, the next four beside it.
  The rail has icons and lists the shortcuts under Help: Ctrl/⌘+N a new film, Ctrl/⌘+O open a project, Ctrl/⌘+,
  Settings, and / to the prompt or the project search. Launch at login is a switch, and every settings section's
  heading sits at the same place.
- **Why:** Starting a film took a blank project, the editor and the assistant before the person could say what they
  wanted; a creative tool should start from the idea.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/home.tsx`, `apps/desktop/src/main/project.ts` (`filmName`),
  `apps/desktop/src/main/index.ts` (`takeBrief`).

## 2026-11-16 — Settings is a page, with General preferences and launch at login

- **What:** Settings opens as a page over Home or the editor (its film paused) with sections for General, Model
  Providers, Coding Agents, Voice Services, Workspace and Diagnostics. General holds the theme (system, light, dark),
  the language and launch at login (installed Windows and macOS builds). Leaving a provider form with edits asks to
  save or discard; a change made in another window is announced instead of overwriting the form. Every pick list is
  one shared select. Open logs folder moved from Workspace to Diagnostics.
- **Why:** The models dialog had grown into the place for every app setting, and preferences had nowhere to live.
- **Breaking:** `settings.json` gains a `preferences` object (`theme`, `language`, `onboardingComplete`,
  `backgroundNoticeSeen`).
- **Upgrade:** Nothing: a settings file without it uses the system's theme and language.
- **Refs:** `apps/desktop/src/renderer/src/settings.tsx`, `apps/desktop/src/renderer/src/select.tsx`,
  `apps/desktop/src/main/providers.ts`.

## 2026-11-16 — The interface is in English or Chinese

- **What:** Every label, message and native dialog the Studio writes is translated to Chinese when the system's
  language is Chinese or Chinese is chosen in Settings → General; the switch is live in every window. A film's words,
  project and motion names, model replies and identifiers are never translated. In Chinese, an English error the
  Studio has no translation for is summarized, with its exact text one click away.
- **Why:** Many of the creators the Studio is for work in Chinese.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/shared/i18n.ts`, `apps/desktop/src/shared/translations.ts`,
  `apps/desktop/src/renderer/src/preferences.tsx`.

## 2026-11-16 — Home replaces the launcher, with a project library

- **What:** Home has Home, My projects and Templates. The project library keeps every project opened, with its cover
  (a still of its film), when it was last opened and modified, search, sort and a grid or list; a project can be
  removed from the list (its files stay) or, when its folder is gone, located again. A template card shows its
  film and plays it on hover; opened, it plays on the stage as the editor does before a copy is made. A first run walks through appearance, the workspace and an assistant. The first close of the main window
  explains that tasks keep running in the tray. Home refreshes when the person returns from an editor, and reopening
  a project moves it to the top.
- **Why:** The launcher showed ten recent paths and no picture of the work; a visual tool's home should show the films.
- **Breaking:** The recent list (`recent-projects.json` in userData) is replaced by the library (`projects.json`); the
  `recentProjects` IPC call is gone. A project's cover is `.motion-studio/cover.jpg` inside it.
- **Upgrade:** Projects opened before do not carry over: open each once (Open project) to add it to the library.
  `recent-projects.json` can be deleted.
- **Refs:** `apps/desktop/src/renderer/src/home.tsx`, `apps/desktop/src/main/project.ts`, `apps/desktop/src/main/index.ts`,
  `docs/design.md`.

## 2026-11-15 — Runtime diagnostics stay in a fixed local log folder

- **What:** Write structured startup, task, build, IPC failure and process-crash diagnostics to main.log in the
  operating system's app log directory. Settings → Workspace offers Open logs folder. Keep one rotated previous
  log, with each file capped at 5 MiB. Record technical context without IPC arguments or conversation payloads,
  and redact credential fields and common secret patterns. Logging failures do not block normal app work.
- **Why:** Packaged applications otherwise lose the terminal output needed to diagnose startup and spawn failures.
- **Breaking:** None.
- **Upgrade:** Nothing. On macOS the folder is ~/Library/Logs/OpenMotionStudio; Windows and Linux use logs/ under
  Electron's userData folder. Logs stay on the computer and are not uploaded.
- **Refs:** `apps/desktop/src/main/log.ts`, `apps/desktop/src/main/logging-startup.ts`.

## 2026-11-15 — Packaged apps can start the film bundler

- **What:** Load esbuild's JavaScript API from app.asar.unpacked so its native executable resolves beside it.
  The desktop driver can now target an installed executable with OMS_EXECUTABLE, using an isolated profile.
- **Why:** Installed builds tried to spawn esbuild inside the virtual app.asar archive when opening a new film or
  template, despite the executable already being unpacked: ENOENT on Windows and ENOTDIR on macOS.
- **Breaking:** None.
- **Upgrade:** Reinstall the rebuilt app; project files and settings need no changes.
- **Refs:** `apps/desktop/src/main/film/film.ts`, `.claude/skills/run-desktop/drive.mjs`.

## 2026-11-15 — The app name is consistently OpenMotionStudio

- **What:** Use OpenMotionStudio in application and installer metadata, UI, notifications, template branding,
  agent prompts and client titles, exported project text, the website and documentation.
- **Why:** The installer and several other surfaces still displayed the spaced form of the product name.
- **Breaking:** The packaged product name changes, including its executable, application bundle, shortcuts and
  Electron's default userData directory. Package identifiers, appId and repository URLs stay the same.
- **Upgrade:** Existing project folders are unchanged. Development profiles under the previous product name can be
  moved to the new userData location while the app is closed to keep their settings and recents.
- **Refs:** `apps/desktop/package.json`, `apps/desktop/electron-builder.yml`, `site/index.html`.

## 2026-11-15 — New films and template copies use a configurable workspace

- **What:** New film creates a fresh project directory without a folder picker. Every template click makes a new
  copy. Both use Documents/OpenMotionStudio by default; Home shows the workspace path and opens Settings → Workspace
  to change it. Existing names get numeric suffixes, including simultaneous creations.
- **Why:** Starting a film should not require choosing an empty folder, and template clicks should preserve prior work.
- **Breaking:** Clicking a template creates a new project instead of reopening its userData/Examples copy.
- **Upgrade:** Existing projects stay in place and can be reopened from Recent or Open folder. A chosen workspace is
  saved in settings.json's optional `workspace` field and applies to future projects only.
- **Refs:** ADR 0015, `apps/desktop/src/main/project.ts`, `apps/desktop/src/main/examples.ts`,
  `apps/desktop/src/renderer/src/settings.tsx`.

## 2026-11-15 — Projects keep working behind Home and dedicated editor windows

- **What:** One main window switches between Home and retained project sessions; closing it hides it to the tray.
  Home shows tasks, waits and progress, with Open here and Open in editor window. A project's existing editor view
  moves into a dedicated window with Ctrl/Cmd+Shift+N, or back to the main window. Closing an editor or switching
  projects keeps its agent and export running, while hidden previews pause playback. Explicit Quit ends background
  tasks. Projects have isolated preview/render sessions; shared settings and recents use serialized atomic saves.
- **Why:** The person should be able to leave an agent working, close its editor and return to its progress from Home.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** ADR 0014, `apps/desktop/src/main/workspace.ts`, `apps/desktop/src/main/index.ts`,
  `apps/desktop/src/main/film/capture.ts`.

## 2026-11-15 — The home screen uses the Studio icon and OpenMotionStudio name

- **What:** The launcher shows the same icon as the packaged app and writes its heading as OpenMotionStudio.
- **Why:** The home screen should identify the Studio with its own icon and joined name.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/app.tsx`, `apps/desktop/src/renderer/src/logo.tsx`.

## 2026-11-15 — The editor has a Home button beside the project's name

- **What:** The editor's top bar starts with a Home icon, a chevron and the project's name. Home returns to the launcher.
- **Why:** The brand mark did not make the way back to the home screen clear.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-15 — Saving a voice returns to narration, and local agent tools bypass proxies

- **What:** Save in voice settings keeps the selected voice id and closes Models, returning to Voice when opened
  there. Generation uses that selection. External agents bypass proxies for the Studio's loopback MCP server;
  Codex must discover the Studio tools before a turn starts, with connection failures reported before a model call.
- **Why:** The selected voice was only used for a sample, saving left the dialog open, and a system proxy could
  send local tool discovery through a proxy that returned HTTP 502, leaving the agent without film or voice tools.
- **Breaking:** None.
- **Upgrade:** Select and save the voice once; earlier selections were not stored. Reopen the app for existing agent
  processes to pick up the local proxy bypass.
- **Refs:** `apps/desktop/src/renderer/src/settings.tsx`, `apps/desktop/src/main/agent/harness.ts`,
  `apps/desktop/src/main/agent/codex.ts`.

## 2026-11-15 — A film without a voice offers settings and generation with the agent

- **What:** Voice offers Voice settings and Generate with agent when the film has no voice selected. Settings opens
  the configured voice provider in Models; generation opens the assistant and asks the current agent to choose a
  suitable voice, generate the narration and check it. Generation is available when the agent is connected and idle.
- **Why:** The dialog explained how to ask for a voice but offered no way to act on it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/voice-dialog.tsx`, `apps/desktop/src/renderer/src/project-view.tsx`,
  `apps/desktop/src/renderer/src/assistant.tsx`.

## 2026-11-15 — MiniMax's group id is optional

- **What:** MiniMax's voice settings can be saved and sampled without a group id. The form labels it optional, and
  speech requests include `GroupId` only when it is set; clearing it also clears it for a sample using a stored key.
- **Why:** Requiring a group id blocked accounts that authenticate with their API key alone.
- **Breaking:** None.
- **Upgrade:** Nothing; an existing group id is still used when set.
- **Refs:** `apps/desktop/src/main/providers.ts`, `apps/desktop/src/main/voice.ts`,
  `apps/desktop/src/renderer/src/settings.tsx`.

## 2026-11-14 — A Remotion project exported from the Studio speaks the film's narration

- **What:** The Remotion export writes `@motionhub/remotion` 0.6 and `@motionhub/runtime` 0.8, gives a narrated film's
  speech to the binding as `src/voice.json`, and copies its clips into `public/voice/`; Remotion times the lines, plays
  the narration and ducks the sounds under it as the Studio's own export does.
- **Why:** A narrated film exported to Remotion lost its voice and its lines' timing.
- **Breaking:** None.
- **Upgrade:** Nothing; a project exported before keeps its versions.
- **Refs:** `apps/desktop/src/main/film/remotion-export.ts`, motionhub-dev/motionhub#109.

## 2026-11-14 — A film's lines are spoken in a voice the person chooses

- **What:** Models has Voices: Azure, ElevenLabs, MiniMax and OpenAI, each with how to get its key, its voices and a
  sentence to hear; there is no default voice. A film names its voice (`<Film voice="azure:zh-CN-XiaoxiaoNeural">`,
  `@motionhub/runtime` 0.8.0), and Voice in the top bar, or the agent's `voice_lines`, speaks its lines into the
  project's `voice/`, only those whose words changed. A voiced line lasts as long as its speech; the preview plays the
  narration, the export mixes it, and a `<Sound duck>` sinks under it; `captions="words"` lights each word as it is
  said. The agent lists voices with `list_voices`, and `check` names lines not yet spoken and speech cut short.
- **Why:** A film's script had no voice, and its captions no timing from speech.
- **Breaking:** None.
- **Upgrade:** Nothing; `@motionhub/runtime` moves from 0.7.0 to 0.8.0. A voice provider's key is sealed in
  `keys.json` like a model's.
- **Refs:** ADR 0011, ADR 0012, `docs/tech/sound-and-captions.md`, `apps/desktop/src/main/voice.ts`,
  `apps/desktop/src/main/narration.ts`, `apps/desktop/src/renderer/src/voice-dialog.tsx`.

## 2026-11-14 — A Remotion project exported from the Studio plays the film's sounds

- **What:** The Remotion export writes `@motionhub/remotion` 0.5 and `@motionhub/runtime` 0.7, plays the film's sounds
  with `<FilmAudio>` in `src/Root.tsx`, and copies each sound file into the project's `public/`. A film with `<Sound>`
  rendered by Remotion now carries them; before, it did not render there.
- **Why:** The Studio's films gained sounds, and an exported project should play what the film does.
- **Breaking:** None.
- **Upgrade:** Nothing; a project exported before keeps its versions.
- **Refs:** `apps/desktop/src/main/film/remotion-export.ts`, motionhub-dev/motionhub#107.

## 2026-11-14 — A film's lines are timed, shown as captions and exported as subtitles

- **What:** A `<Line>` can say when it is said (`at`, `dur`); lines that do not share their scene evenly.
  `<Film captions>` shows the line being said at the foot of the picture, in the preview and the export alike. Every
  MP4 export carries the lines as a subtitle track and writes them beside it as an `.srt` file. The timeline shows the
  lines on a Lines row.
- **Why:** A film's script had no timing and could not be read with the sound off.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/sound-and-captions.md`, `apps/desktop/src/main/film/captions.ts`, `apps/desktop/src/renderer/src/timeline.tsx`.

## 2026-11-14 — A film plays music and sound effects, and exports with sound

- **What:** A film's `<Sound>` elements (`@motionhub/runtime` 0.7.0; ADR 0010) play in the preview, in step with the
  picture, and are mixed into the exported MP4 as AAC; a film with none exports picture only, as before. Assets take
  MP3, WAV, M4A and OGG files and play them; the timeline shows each sound on a Sound row with its waveform; the stage
  bar turns the preview's sound off; the export dialog says what is mixed; the agent learns `<Sound>`, and its `check`
  lists the sounds and fails on a missing file. Each file's waveform is kept in `.motion-studio/peaks/`.
- **Why:** A film had no way to carry sound.
- **Breaking:** None.
- **Upgrade:** Nothing; `@motionhub/runtime` moves from 0.5.0 to 0.7.0.
- **Refs:** ADR 0010, `docs/tech/sound-and-captions.md`, `apps/desktop/src/main/film/mix.ts`, `apps/desktop/src/preview/sound.ts`.

## 2026-11-14 — Questions take the composer's place, failures say what to do, a new start

- **What:** A question the agent asks with answers now stands where the composer was, the conversation dimmed behind
  it, with its recommended answer marked and "Something else…" back to the box; answered, it stays as a dashed card
  with the answer. A failed turn is a card that offers what to do: Open Models (or Sign in, or Change the cap), Use
  another agent, and Try again with the message that is back in the box. An empty conversation offers four ways to
  start, the brief among them, and how to point at the picture.
- **Why:** A question was easy to miss in the conversation, a failure left the person to work out the next step, and
  the empty conversation said little.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/assistant.tsx`, `apps/desktop/src/main/agent/claude.ts`,
  `apps/desktop/src/shared/api.ts`, `docs/design.md`, `docs/tech/assistant-panel.md`.

## 2026-11-14 — Point at anything with @, import with +, one tray for the next message

- **What:** Typing @ in the composer (or its @ button) opens a picker over the film's scenes, layers and lines and the
  project's assets and motions, narrowed as you type; a pick joins the next message. + imports images or fonts into
  the project and adds them too. References and marks now sit in one tray over the composer with their count, and
  Send reads "Send 3". A motion in the project can be a reference.
- **Why:** Pointing the agent at a part of the film or the project took a trip to another panel.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/reference-picker.tsx`, `apps/desktop/src/renderer/src/assistant.tsx`,
  `apps/desktop/src/main/agent/references.ts`, `docs/design.md`.

## 2026-11-14 — Choose your coding agent's model and effort; the agent sits at the assistant's top

- **What:** Claude Code's model (an alias or a full name), effort, fallback model and cap per turn, and Codex's model
  (from its own list) and effort, are set in Models under Your coding agents and kept in the app's `settings.json`
  (`agents`). The project's agent is now a chip at the top of the assistant, with a dot for whether it can take a
  message; its menu changes the agent and, for Claude Code or Codex, its model and effort. The composer's picker is
  gone, and New conversation is an icon. A Claude Code turn stopped at its cap says so, and counts its tokens.
- **Why:** The person picks how their own agent runs, as they would in its own app, and sees which agent and model a
  project talks to before sending.
- **Breaking:** None.
- **Upgrade:** Nothing; unset settings leave each agent on its own defaults.
- **Refs:** `apps/desktop/src/main/providers.ts`, `apps/desktop/src/main/agent/claude.ts`,
  `apps/desktop/src/main/agent/codex.ts`, `apps/desktop/src/renderer/src/assistant.tsx`, `docs/tech/architecture.md`.

## 2026-11-14 — A turn reads as one block and ends with its outcome

- **What:** A turn's tool calls are one framed block ("How it got there · read 2 files · edited 1 file · checked
  twice"), open while it runs and folded after, with what the agent said between calls inside it and its answer
  under it; files are named in the project, never by their whole path. The turn's card says how it ended (Done,
  Stopped, Failed), its time and tokens, the files it changed, its last check, the film's new length and what changed,
  with Go back to before this and Copy. The last three turns are drawn whole, earlier ones behind "Show N earlier
  turns". While a turn runs, its phases show as a row of steps, and Send is a red Stop. A long answer no longer clips
  in a full conversation.
- **Why:** The work split a turn into many lines and buried its answer, outside agents' paths named the person's
  folders, and the end said little of what the turn did.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/assistant.tsx`, `apps/desktop/src/renderer/src/activity.ts`, `docs/design.md`.

## 2026-11-14 — Every turn says its tokens and time, and is logged

- **What:** Each turn of every agent ends with its time and tokens (input, cached, cache written, output, reasoning,
  model calls), shown on the turn's card ("Worked for 1m 12s · 18.4k tokens", the parts on hover), with the project's
  total beside the assistant's title. Each turn is also appended as one JSON line to the project's
  `.motion-studio/usage.jsonl` (ADR 0009), with Claude Code's reported cost there, never shown. Chat Completions
  providers' cached prompt and reasoning tokens are now read too.
- **Why:** To track and tune the agents' turns, and so the person sees what a turn took.
- **Breaking:** None.
- **Upgrade:** Nothing; a project's log starts with its next turn, and git already leaves `.motion-studio/` out.
- **Refs:** ADR 0009, `apps/desktop/src/main/usage.ts`, `docs/tech/assistant-panel.md`.

## 2026-11-14 — The outline follows the playhead and shows the film

- **What:** The outline is one row a scene (a frame of it, its first line, number, start and length) on a rail that
  marks the scenes played, the one playing and how far into it the playhead is. The scene playing opens and the one
  left closes, unless the person folded it; Collapse all / Expand all sits at the top, the film's own layers in a group
  of their own. Layers are listed by name, topmost first; a scene's first line is its title and no longer repeated, and
  the "Script · read only" and size labels are gone. A layer hovered in the outline or on the timeline is lit in both
  and drawn on the picture.
- **Why:** The outline listed each title twice and every layer's size, showed no picture, and barely said where the
  playhead was.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/outline.tsx`, `docs/design.md`.

## 2026-11-14 — Words sent to Claude Code while it works go into its turn

- **What:** On a project that talks to the person's own Claude Code, Enter during a turn sends the words into that
  turn at once, shown where they were sent, instead of keeping them for the turn's end; Ctrl+Enter still stops the turn
  and sends. A message with marks or references, and every message to Codex or the built-in agent, still waits. The
  Studio starts Claude Code with `--replay-user-messages`, to tell a message taken into the turn from one Claude Code
  runs after it.
- **Why:** Claude Code takes a message mid-turn, so a correction reaches it before it goes further the wrong way.
- **Breaking:** None.
- **Upgrade:** Nothing; a running Claude Code session gets the new flag when it is next started.
- **Refs:** `apps/desktop/src/main/agent/claude.ts`, `docs/tech/architecture.md`, ADR 0008.

## 2026-11-14 — A film is set in its motions' own faces

- **What:** The faces a motion carries (`react/fonts/fonts.json` and its WOFF2 files) are loaded in the preview before
  the film draws, and a still or an export waits for them, so type set with a motion's `var(--font-<name>)` is in that
  face rather than the system's. Each build writes them as `.motion-studio/build/fonts.css`; an entry that is not a
  WOFF2 beside its list is left out and logged. The agent is told the faces are there.
- **Why:** Every film made in a motion with its own type fell back to the system's faces.
- **Breaking:** None.
- **Upgrade:** Nothing; the next build of a project writes its faces.
- **Refs:** `apps/desktop/src/main/motions.ts`, `apps/desktop/src/preview/core.tsx`, `docs/tech/architecture.md`.

## 2026-11-13 — Each scene on the timeline shows its frames, and the stage goes full screen

- **What:** A scene's block on the timeline is its title over a strip of its frames. They are photographed once a
  build has stood for a moment and kept in the project's `.motion-studio/thumbs/`, one file named by the build's hash,
  replaced when the film changes. The stage's controls end with full screen, which Esc leaves.
- **Why:** A film's shape reads at a glance from its pictures, not from scene names; and a film is judged at its size.
- **Breaking:** None.
- **Upgrade:** Nothing. A project gains `.motion-studio/thumbs/`, which git already leaves out with the rest of
  `.motion-studio/`.
- **Refs:** `apps/desktop/src/main/film/capture.ts`, `apps/desktop/src/renderer/src/timeline.tsx`, `docs/tech/architecture.md`.

## 2026-11-13 — The timeline shows what is selected and what changed

- **What:** A selected scene has a heavier cobalt ring, and the scene of a selected layer a thin one; a selected layer
  span is solid cobalt on a cobalt tint, and a span the last turn changed is tinted green as well as ringed. The empty
  Marks lane says that dragging along it marks a stretch.
- **Why:** Selection and change were faint on the timeline, and marking a stretch was found only by trying.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/timeline.tsx`, `docs/design.md`.

## 2026-11-13 — A turn says how long it took, and the agent's steps step back

- **What:** The card where a turn ends opens with how long it took (`Worked for 1m 12s`). The line for a run of the
  agent's tool calls is a size smaller than its words.
- **Why:** The agent's answer is what a person reads; its steps are there to open when wanted.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/assistant.tsx`, `apps/desktop/src/renderer/src/activity.ts`.

## 2026-11-13 — What is typed while a project opens is kept

- **What:** The assistant is no longer drawn again once the project's agent is found, a few seconds after the project
  opens; only a switch of agent starts it afresh.
- **Why:** Words typed into the composer in those first seconds, and stills opened, were dropped.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/project-view.tsx`.

## 2026-11-13 — The stills an agent looked at take one row

- **What:** The stills under a run of the agent's tools are one row of four small thumbnails; past four, the row shows
  three and a count of the rest, which opens them all.
- **Why:** A turn that checked many frames filled the assistant with pictures and pushed its answer out of view.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `apps/desktop/src/renderer/src/assistant.tsx`, `docs/design.md`.

## 2026-11-13 — The workspace gives the film and the timeline the room

- **What:** The stage is no taller than its film where there is room, and its foot carries play, the time, loop and the
  pointing tools as labelled buttons (Pick, Region, Guides); the timeline takes the height the stage leaves, with its
  own head (zoom, fit, follow, fold). The project tools are four labelled tabs (Outline, Inspector, Assets, Motions);
  History opens from the assistant's head and Checks from the status in the top bar, which counts the last check's
  issues. Each panel hides from its own head and comes back from the top bar; the top bar's focus button is gone (F
  stays). The right panel is at least 280 px wide.
- **Why:** The picture sat in a tall dark box with its controls in another panel, and the side panel's rail and
  headings pushed its content down; the space now goes to the film and the timeline.
- **Breaking:** None.
- **Upgrade:** Nothing. A stored right-panel width under 280 px opens at 280 px.
- **Refs:** `docs/design.md`, `apps/desktop/src/renderer/src/project-view.tsx`, `apps/desktop/src/renderer/src/preview.tsx`.

## 2026-11-13 — A project can talk to the person's own Claude Code

- **What:** The agent picker and Models also offer the person's own Claude Code, when it is installed where
  Anthropic's installer puts it (`~/.local/bin`), new enough and signed in. The Studio drives it through `claude -p`
  with stream-json, with the film's skill appended to its system prompt, the Studio's tools as its only MCP server,
  none of the person's settings, hooks or other servers, and only Read, Glob, Grep, Edit and Write of its own tools;
  its turns are checkpointed from the files that changed as Codex's are. It signs in only with `claude auth login`.
- **Why:** So a person who already uses Claude Code makes films with it, on their own sign-in (ADR 0008).
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/adr/0008-the-persons-own-coding-agent.md`, `apps/desktop/src/main/agent/claude.ts`.

## 2026-11-13 — A project can talk to the person's own Codex

- **What:** The composer's agent picker offers the person's own Codex, when it is installed (where OpenAI's installer
  puts it), new enough and signed in. The Studio drives it through `codex app-server` with the film's skill as its
  instructions and the Studio's tools (check, still, the motions, a question card) as its only MCP server, the
  person's other Codex servers, apps and plugins switched off for the session; its words, commands, file changes and
  stills show in the panel, its turns are checkpointed from the files that changed, and Stop interrupts it. The
  project's choice, Codex's thread and the panel's conversation are kept in `.motion-studio/agent.json`. What Codex
  asks to do outside its sandbox (a command, files elsewhere, the network) is a card the person answers: allow once,
  for the session, or deny. A motion from motionhub that it changes is put back after the turn. Models lists Codex
  under Your coding agents with where it stands, links to OpenAI's page to install or update it, and signs in to it
  through Codex itself.
- **Why:** So a person who already uses Codex makes films with it, on their own plan and sign-in (ADR 0008).
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/adr/0008-the-persons-own-coding-agent.md`, `docs/tech/architecture.md` ("External agents"),
  `apps/desktop/src/main/agent/codex.ts`.

## 2026-11-13 — A timeline to move about in, keys for the workspace, and aids for looking

- **What:** The timeline zooms about the pointer (Ctrl and the wheel, + and −, Shift+Z fits), follows the playhead
  while the film plays, brings back a playhead out of view, names the moment and scene under the pointer, and shows the
  last check's issues on its ruler, each one click from the assistant. New keys: K plays, ↑ ↓ go between scenes, Home
  and End to the ends, `[` `]` `\` show or hide the panels, G the safe-area guides; Esc does one thing at a time; the
  shortcuts dialog groups them. The outline follows the scene that plays, and a scene's layer can play alone.
- **Why:** So a longer film can be read and moved about in, and looked at closely, without the mouse.
- **Breaking:** Esc no longer puts the tool down and clears the selection at once: it does the first, then the second.
- **Upgrade:** Nothing.
- **Refs:** `docs/design.md`, `docs/tech/creator-workflow.md`, `apps/desktop/src/renderer/src/timeline.tsx`.

## 2026-11-13 — The agent's work reads as it happens, and a turn can be taken back

- **What:** Each run of the agent's tool calls reads as one line of plain words with its stills beside it, and the
  progress card warns when the same tool keeps failing. A turn's end says what it changed in the film and lights those
  scenes, layers and lines in the outline and the timeline; the last turn can be undone, files and conversation, with
  its message back in the composer. The agent can ask a question with answers to click (`ask_person`). While it works,
  a message waits for the turn or, with Ctrl+Enter, stops it; the stage says it is working, and Export waits. An error
  on the stage can go to the agent as an issue, and a turn that ends while the window is behind others notifies.
- **Why:** So the person can follow, steer and take back the agent's work without reading every tool call.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/creator-workflow.md`, `docs/tech/architecture.md` ("The agent"), `apps/desktop/src/renderer/src/activity.ts`.

## 2026-11-13 — The app has motionhub's icon and mark, and no menu bar in its window

- **What:** The window, the taskbar and the installers show motionhub's app icon instead of Electron's
  (`apps/desktop/resources/icon.png` and, for Windows, `icon.ico`, set in `electron-builder.yml` and on the window).
  The mark in the app and on the introduction page, and the page's favicon, are the brand's current ones, the mark
  in its own colour (`--mark`).
  The window has no File, Edit, View, Window menu bar on Windows and Linux; a Mac's menu bar keeps only the app's
  menu, Edit and Window.
- **Why:** The Studio was not recognisable in the taskbar, the dock or a window's title bar, and the default menu
  offered nothing the Studio's own controls do not, but reload and developer tools.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/design.md` ("Identity").

## 2026-11-13 — Marks say what should change, and point at time and source

- **What:** Picking an element or dragging a region on the picture opens a box beside it that asks what should change
  there, and a pick can step out to the element around it and back in. Dragging along the timeline's Marks lane marks
  a stretch of the film. Marks wait above the composer with their notes, lit on the picture and the timeline while in
  hand; a sent message shows each with the frame the model saw. What was last selected in the outline or timeline goes
  with the next message unless put aside, and every marked or referenced scene, layer and line tells the agent where
  film.tsx writes it.
- **Why:** Several precise changes in one message, each said where it applies, are what pointing at the film is for.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/creator-workflow.md`, `docs/tech/architecture.md` ("The agent"), `apps/desktop/src/main/agent/marks.ts`.

## 2026-11-11 — An introduction page at studio.motionhub.dev

- **What:** `site/` is the Studio's introduction: what it is, the path from a folder to an MP4, what makes it different,
  the film's format and how to get it, with screenshots of the app. A static-assets Worker serves it at
  `studio.motionhub.dev` (`site/wrangler.jsonc`), deployed by `.github/workflows/site.yml` on a push to main that
  changes it. It was first published on GitHub Pages, whose `motionhub-dev.github.io` address Chrome flags as a lookalike
  of `motionhub.dev`; that workflow is gone.
- **Why:** So the Studio has a page to point people at, under motionhub's own domain.
- **Breaking:** None.
- **Upgrade:** Add the `CLOUDFLARE_DEPLOY_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets (the account that holds
  `motionhub.dev`), then run the Site workflow; turn GitHub Pages off in Settings → Pages.
- **Refs:** `site/index.html`, `site/wrangler.jsonc`, `docs/tech/architecture.md`.

## 2026-11-11 — An exported Remotion project takes @motionhub/remotion 0.4.0

- **What:** A film exported as a Remotion project pins `@motionhub/remotion` 0.4.0 instead of 0.3.0. Its film's scenes
  play as before, and a component of a motion at `motion/0.6` can be given a composition whose props Remotion Studio
  edits (`paramsSchema`, `paramDefaults`).
- **Why:** 0.4.0 is the binding that reads a component's parameters (motionhub `motion/0.6`).
- **Breaking:** None.
- **Upgrade:** Nothing; a project exported before keeps 0.3.0 until its `package.json` is changed.
- **Refs:** `apps/desktop/src/main/film/remotion-export.ts`.

## 2026-11-10 — Model selection moves into the composer

- **What:** The active model and Models entry point now sit in the assistant composer, below the message and beside Send.
  Long model names truncate with their full model/provider name on hover; the top bar keeps project-level controls.
- **Why:** Model choice belongs to the conversation it controls.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/design.md`.

## 2026-11-10 — A more recoverable creator workspace

- **What:** Local source checkpoints and conflict-aware restore; a scene/layer/script outline connected to the preview,
  scoped scene playback, structural message references, a zoomable read-only layer timeline and focus mode. Added
  activity feedback, sampled checks and export preflight, bundled films, a prompt brief, local image/font import and
  cached Motion reels. Compile errors keep the last compiled preview with a visible notice. New dialogs contain focus.
- **Why:** Creators need to understand a film, point at precise changes and safely explore alternatives.
- **Breaking:** The internal preload API now carries references and build ids when sending a message. Numbered preview
  bundles and local checkpoint state are maintained by the app; the film format is unchanged.
- **Upgrade:** Nothing. Checkpoints start with future agent source writes; existing work is not reconstructed.
- **Refs:** `docs/tech/creator-workflow.md`, `docs/adr/0007-local-checkpoints-track-agent-source-writes.md`, `docs/design.md`.

## 2026-11-10 — Export a film as a Remotion project

- **What:** The menu beside Export writes the film as a Remotion project into an empty folder: the project's files as
  they are, and a Remotion entry whose one composition draws each scene in a `Series.Sequence` of its own, named by its
  id, so the scenes are clips on Remotion Studio's timeline. Their lengths, and the composition's, come from `film.tsx`
  (`@motionhub/remotion` 0.3.0's `sceneFrames` and `filmMetadata`, `@motionhub/runtime` 0.6.0's `<FilmScene>`); a
  scene added, taken out or moved in `film.tsx` afterwards is named in Remotion's error until `src/Root.tsx` places it.
- **Why:** So a film can go on, or be rendered, in Remotion without being rewritten.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/architecture.md` ("Export"), `apps/desktop/src/main/film/remotion-export.ts`.

## 2026-11-10 — A film is scenes of layers and lines

- **What:** A film draws a `<Film>` of `<Scene id duration>`s, each holding `<Layer id x y w h z>`s (boxes of the frame)
  and `<Line id>`s (what it says), from `@motionhub/runtime` 0.5.0; the scenes' durations are its length, so `film`
  keeps only its size and rate. A new film starts as two scenes. The timeline shows the scenes, a pick names the scene
  and layer it is in (in the Inspector and to the agent), and `check` draws each scene and outlines them. There is no
  declared animation: a layer's content moves itself. Every film draws a `<Film>`: one drawn as one component, or one
  that gives `film.seconds`, is refused with a message saying how to write it. `film.width`, `height` and `fps` are
  checked.
- **Why:** The Studio and the agent knew nothing of what a film was made of (ADR 0006).
- **Breaking:** A film written before this, one component with `film.seconds`, no longer plays; wrap it in
  `<Film><Scene id="main" duration={…}>…</Scene></Film>` and take `seconds` out of `film`, or ask the agent to.
- **Upgrade:** Nothing.
- **Refs:** `docs/adr/0006-a-film-is-scenes-of-layers-and-lines.md`, `docs/tech/architecture.md` ("The film").

## 2026-11-10 — The Studio keeps one engine, its own

- **What:** Remotion and HyperFrames projects are no longer made or opened, and the engine contract is gone: a film is
  `film.tsx` drawn by `@motionhub/runtime`, bundled, played and exported by the Studio (`src/main/film/`). The launcher
  has Open folder and New film, with no engine to choose; the top bar and recent projects show no engine; the timeline
  shows the ruler, the marks and the playhead (the clips lanes were HyperFrames'). `Project.engine` is `Project.film`,
  `createProject()` takes nothing, `onCreateProgress` and `FilmInfo.clips` are gone, and the preview page's policy no
  longer allows inline scripts.
- **Why:** The benefits of three engines were a developer's (bringing an existing project), and their cost was every
  picture feature built three times, the skill tuned three ways and two upstreams to follow (ADR 0005).
- **Breaking:** A Remotion or HyperFrames project made with an earlier build is opened as a folder with no film, and is
  offered a `film.tsx`; its own files are untouched. Open it with Remotion's or HyperFrames' own tools.
- **Upgrade:** Nothing.
- **Refs:** `docs/adr/0005-the-studio-has-one-engine-its-own.md`, `docs/prd/positioning.md`, `docs/tech/architecture.md`.

## 2026-11-10 — An inspector, keyboard shortcuts, tooltips, and a Mac window without a title bar

- **What:** The right panel has Motions and Inspector tabs; an element picked on the picture opens in the inspector
  with its path, moment, position and size in the film's pixels, words, look and attributes. A pick now reports the
  element's computed font, size, weight, colour, and background, opacity and transform where set
  (`PickedElement.styles`), and the agent reads them with the mark. ? (or the keyboard button) lists the shortcuts.
  Controls show their tips, with their keys, in one layer no panel clips. On macOS the window has no title bar: its
  buttons sit over the top bar, which moves the window.
- **Why:** P3 of the visual direction.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/design.md`, `apps/desktop/src/renderer/src/{inspector,tooltip}.tsx`, `apps/desktop/src/preview/pick.ts`.

## 2026-11-10 — The assistant reads as Markdown, motions open as pages, Models tests a connection

- **What:** The assistant draws the agent's replies as Markdown, and a still clicked seeks the film to its moment and
  opens large; the composer grows with its text. The Motions panel shows posters, and a motion opened is its page: its
  colours, its components with their previews, its MOTION.md (`motionDetail`). Models is two panes, providers and the
  selected one's form, starting a new one from a service card, with **Test connection** (`testProvider`), which makes one
  call as the form stands and says whether the model answered and called a tool.
- **Why:** P2 of the visual direction.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/design.md`, `apps/desktop/src/renderer/src/`, `apps/desktop/src/main/agent/test-connection.ts`.

## 2026-11-10 — The Studio wears motionhub's paper and ink

- **What:** A visual layer from one set of tokens, light and dark (`docs/design.md`): motionhub's colours, Inter and
  JetBrains Mono shipped with the app, Lucide icons. The launcher has a card per engine and recent projects with their
  engine and path. The workspace has a top bar (the project, its engine, whether it builds, the model, Export with its
  progress), panels whose sizes are dragged and remembered, the film on ink with the marking tools over it, a transport
  with frame steps, a mm:ss.cc clock and looping, and the timeline along the bottom with a ruler, the clips, the marks and
  the playhead. Keys: Space, ← →, C, Esc. An export ends in a toast with Show in folder (`showExported`).
- **Why:** P1 of the visual direction: the Studio looked like a prototype.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/design.md`, `apps/desktop/src/renderer/src/`.

## 2026-11-10 — A HyperFrames film has a read-only timeline

- **What:** Under the preview of a HyperFrames film, its clips as its runtime lists them, a lane per track, with the
  playhead; clicking a clip seeks to its start. The bridge reports the clips and the frame rate with the film
  (`FilmInfo.clips`). Native and Remotion films show no timeline.
- **Why:** Step 6's timeline, where an engine already knows its clips.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/architecture.md` ("The UI").

## 2026-11-10 — Point at the picture for the agent

- **What:** Two tools on the preview, Pick and Region, mark an element or a region of the picture at the moment shown,
  up to five for the next message. The marks are flagged on the scrubber and listed above the message box. The agent
  receives each described (its moment, its box, the element's path, words and `data-*` attributes) and, where the model
  reads images, the frame at that moment with the mark outlined in red. One script on every preview page
  (`studio/pick.js`) answers for all three engines. `sendMessage` takes the marks.
- **Why:** Step 6 of the order of work: a person who cannot say which thing is wrong points at it.
- **Breaking:** None.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/architecture.md` ("The agent", "The engine contract").

## 2026-11-10 — A film can be a HyperFrames project

- **What:** The home screen makes a HyperFrames project too: scaffolded with GSAP loaded from `node_modules`, installed
  with npm, previewed as its own `index.html` under HyperFrames' runtime with the Studio's bridge, written by the agent
  with a HyperFrames skill, and exported with the project's own `hyperframes render` and the Studio's ffmpeg. Taking a
  motion runs `motionhub-hyperframes`, which writes `assets/motion/`. The preview scheme now serves the project's own
  files (`/project/`) and the Studio's scripts (`/studio/`), allows inline scripts and fetches within itself, and is
  CORS-enabled, so a motion's fonts load in every engine. HyperFrames' usage telemetry is off for the commands the
  Studio runs.
- **Why:** Step 5 of the order of work: every engine in ADR 0001.
- **Breaking:** None.
- **Upgrade:** Nothing. A HyperFrames project needs Node.js and npm.
- **Refs:** `docs/tech/architecture.md` ("The engine contract"), ADR 0001, ADR 0004.

## 2026-11-10 — A film can be a Remotion project

- **What:** The home screen makes a native film or a Remotion project. A Remotion project is scaffolded (its
  compositions listed in `src/compositions.ts`, which `src/Root.tsx` registers) and installed with the person's npm; it
  previews in `@remotion/player` on the Studio's preview page, the agent writes it with a Remotion skill, and it exports
  with the project's own `remotion render`. Motions reach it through `@motionhub/remotion`. A folder holding a Remotion
  project opens as one. The engine contract is now code (`engines/engine.ts`).
- **Why:** Step 4 of the order of work: the person keeps the engine they know.
- **Breaking:** None.
- **Upgrade:** Nothing. A Remotion project needs Node.js and npm on the person's machine, and its first export downloads
  Remotion's headless Chrome.
- **Refs:** `docs/tech/architecture.md` ("The engine contract"), ADR 0001, ADR 0004.

## 2026-11-10 — The agent runs on any OpenAI Chat Completions server too

- **What:** A provider now names its protocol: Anthropic Messages or OpenAI Chat Completions. The Chat Completions
  translation keeps the agent's conversation in the Messages shape, so a project's conversation can move between
  providers. Presets for OpenRouter, OpenAI, DeepSeek, Gemini, Ollama and LM Studio join Anthropic and MiniMax; a provider
  says whether its model reads images, and a server on this computer needs no key.
- **Why:** Step 3 of the order of work: any model the person chooses.
- **Breaking:** A provider saved before this has no protocol and is treated as Messages; re-save it to set one.
- **Upgrade:** Nothing.
- **Refs:** `docs/tech/architecture.md` ("Providers"), ADR 0003.

## 2026-11-10 — Make a native film with an agent, a motion from motionhub, and export it

- **What:** A new project is a native film: `film.tsx`, a React component drawn by `useTime()` from `@motionhub/runtime`,
  bundled with esbuild on every change, played in a sandboxed frame on the `oms-preview:` scheme and exported to an H.264
  MP4 by photographing each frame offscreen and piping it to ffmpeg. The motion panel searches motionhub.dev and takes a
  motion into `motions/@<scope>/<slug>/` with `motions.lock.json`, as `@motionhub/cli` does. The assistant runs the
  Studio's own agent on a provider the person sets up (any server speaking the Anthropic Messages protocol; presets for
  Anthropic and MiniMax): it writes and edits the film, checks it, looks at stills and takes motions. Providers are kept
  in the app's `settings.json`, keys sealed with `safeStorage` in `keys.json`; a project's conversation in
  `.motion-studio/session.json`.
- **Why:** Step 2 of the order of work: the whole product on one engine.
- **Breaking:** None.
- **Upgrade:** Nothing. The app now ships esbuild and ffmpeg (`ffmpeg-static`, a GPL build: see the architecture's open
  questions).
- **Refs:** `docs/tech/architecture.md`, ADR 0004.

## 2026-11-10 — The desktop app opens and creates projects

- **What:** The Electron app (`apps/desktop`) opens a folder as a project, makes an empty folder a new project (its
  `.motion-studio/` state directory, added to `.gitignore`), and lists the ten most recent projects (kept in the app's
  `userData` as `recent-projects.json`). CI builds installers for macOS (DMG, zip), Windows (NSIS) and Linux (AppImage,
  tarball) on every push to `main`, tag and pull request.
- **Why:** Step 1 of the order of work: packaging and signing settled before the product is built on them.
- **Breaking:** None.
- **Upgrade:** Nothing. Signed builds need the secrets listed in `CLAUDE.md` ("Commands").
- **Refs:** `docs/tech/architecture.md` ("Order of work"), ADR 0002.
