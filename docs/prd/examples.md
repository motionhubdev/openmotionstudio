# Examples

> **Status:** Plan · **Updated:** 2026-11-22

Which films openmotion.studio shows as examples of the Studio's work, what each offers, and how new ones get made.

## Conclusion

/examples is a wall of films made in the Studio. Each example shows its finished film first and plays it in place; it
links to a tutorial when one was recorded and offers the project to download when one was published. New examples
are made by a scheduled agent, one a day, and land as a pull request that a person reviews: merging it is publishing.

## What an example is

- **The film**, first: its poster is a frame of the film itself, and it plays where it stands, with its length, the
  agent that made it and the look it used.
- **A tutorial**, when there is one: a page at /examples/<name> with the session that made the film, its steps beside it
  and its exact prompts. The two first examples have recorded, narrated tutorials.
- **Its files**, when there are any: a zip a person opens in the Studio. The source is the project as the Studio keeps
  it (`film.tsx`, `motions/` and `motions.lock.json`, its media, and a `README.md` with its brief and what to ask
  for), without `.motion-studio/`. The launch film offers its photos and prompts only, and says so.

## Built (stage 0)

- /tour became /examples, and each tutorial moved from /tour/<name> to /examples/<name>. The site's Worker sends the
  old addresses on for good (301), the query kept.
- The two tutorials became the first two examples: Ember's launch film and The Hollow Mountain.
- Three more were made the way the daily agent will make them, by hand this once: an agent wrote each as a project,
  the built Studio exported it with no window (the template export's way, opening a folder), and its frames were
  checked before it was kept. Signal (a motion study), Eight billion (a data story on the UN's figures) and Four
  steps (an explainer in kinetic type) each offer their source and name the post that inspired them.
- Twenty-three narrated explainers made with VisoTalk follow them under a head of their own, as visotalk.dev rendered
  them: its film with its narration, its poster and its source bundle (`<name>.visotalk`, which opens in VisoTalk, not
  in the Studio), in `site/media/visotalk/<name>/` beside the MIT notice their source carries. The page names no tool:
  their head says they were made with another engine and that their source is not a Studio project, and each card links
  its original and credits the media of others. A film VisoTalk made in
  Chinese as well is one card whose cut, poster and source follow the page's language. Left out: VisoTalk's own
  introduction (it presents VisoTalk, and has no source), Why is the sky blue? (Why the sky is blue and sunsets are red
  covers it, newer), the 16-second Why ice floats, and the looks' samples (they are MotionHub's looks, shown on the
  front page). Three films over a Worker asset's 25 MiB were encoded again at a lower video rate, their sound copied.

## Planned

1. **Examples as data.** Each example is `site/examples/<name>.json` (title and summary in English and Chinese,
   category, look, agent, length, inspiration links, and the addresses of its film, poster, files and tutorial); the
   list is built from them when the site deploys, with filters by category. Films and zips move to an R2 bucket on a
   media host of the site's own: `site/media` is already 146 MB in git, and a Worker's static asset is at most 25 MiB.
2. **A headless export of any project.** `pnpm templates` already bundles and exports the Studio's templates without
   a window; it learns to export a project folder given to it, so an agent with no screen can check frames and render
   the MP4 the Studio would.
3. **A tutorial written from the session.** Each turn's prompt, tokens and time are in `.motion-studio/usage.jsonl`
   (ADR 0009) and its result in the checkpoints (ADR 0007); a script turns them into a tutorial page of steps, each with
   its prompt and a frame of the film after it. Recorded, narrated tutorials stay for a few films worth starting from.
4. **The daily agent.** A scheduled cloud agent runs one skill in this repository each day:
   - *Choose*: read the last two days of motion work collected by AwesomeBuilders, skip kinds already made this week
     (a week's share: launch films, motion studies, data stories, narrated explainers, looks), and write a brief.
   - *Make*: write the film in a fresh project, with a look from MotionHub when it fits.
   - *Check*: export it headless, look at six to eight frames for clipped, overlapping or empty pictures, and fix them;
     past a set number of tries or a set cost, stop and say why in the pull request.
   - *Publish*: upload the film, the poster, the source and the tutorial, write the example's JSON, and open a pull
     request with the poster, the frames it checked and its inspiration. It never merges.

## Rules

- **Inspired, never copied.** An example takes a kind of film, a rhythm or a technique from the work it cites, never
  its pictures, characters or words, and links the original post instead of showing it.
- **A person merges.** Nothing the agent makes is public until someone has watched it.
- **The agent's keys stay in its environment.** Its model key and its write access to the media bucket are secrets of
  the cloud environment, never in the repository, a pull request or a log.
