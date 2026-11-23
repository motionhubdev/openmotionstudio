# 20. oms is published on npm from a tag

> **Status:** Accepted · **Date:** 2026-11-23

Where people get `oms`, and what a version must pass before it reaches them.

## Decision

`@motionhub/oms` is published on npm, under the motionhub scope its runtime and `@motionhub/cli` are published in.
People install it with `npm install -g @motionhub/oms`. Packing it from the repository remains the way to try
unreleased work.

- **A version is a tag** `oms-v<version>` on a commit main holds, naming `apps/cli/package.json`'s version.
  `.github/workflows/publish-oms.yml` then:
  1. checks the tag, runs the gate and packs the tarball once;
  2. installs that tarball on Linux, macOS and Windows, each beside an ffmpeg from the platform's package manager,
     and drives it with `apps/cli/scripts/test-installed.mjs`;
  3. stages the same tarball on npm by trusted publishing (GitHub's OIDC, in the `npm-release` environment, no
     token), its scripts not run.
- **A maintainer approves it** with `npm stage approve <stage-id>` and their second factor. Nothing reaches people
  before that.
- **The first version is staged by a maintainer by hand** from the tarball the workflow tested, since npm takes a
  trusted publisher only on a package that exists. The trusted publisher is set once the package exists, and every
  later version comes from its tag ([publishing oms](../ops/publishing-oms.md)).
- **Every pull request and push to main** packs, installs and drives `oms` on the same three platforms
  (`build.yml`, job `oms`), so a tag finds nothing new.

## Reason

`oms` was installed from a packed tarball for eight trial films. A person, or their agent, should not need the
repository and pnpm to get it, and npm is where Claude Code, Codex and Node's tools already are. The motionhub
packages are published this way already, and their maintainers approve with the same steps. Testing the one
tarball that is staged, on each platform people use, keeps a version from working only where it was packed.

## Cost

- A release waits for a maintainer's approval, and the first one is staged by hand.
- npm shows a public placeholder, `0.0.0-stage`, from the first staging on.
- The test downloads a Chrome and reaches motionhub.dev and Google Fonts, so CI depends on them.
- A version carries the Studio's player, runtime and film format as they were at its commit: a film it makes may
  need a Studio at least as new.
