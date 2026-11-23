# Publishing oms

> **Status:** Current · **Updated:** 2026-11-23

How a version of `@motionhub/oms` reaches npm, and what a maintainer does for it.

A tag `oms-v<version>` on main runs `.github/workflows/publish-oms.yml`: it packs the tarball, drives it installed on
Linux, macOS and Windows, and stages it on npm. A maintainer approves it. The decision is
[ADR 0020](../adr/0020-oms-is-published-on-npm-from-a-tag.md).

## A version

1. In a pull request, set `version` in `apps/cli/package.json` and add the change to `CHANGELOG.md`. Merge it.
2. Tag the merged commit and push the tag:

   ```bash
   git fetch origin main
   git tag oms-v<version> origin/main
   git push origin oms-v<version>
   ```

3. Wait for **Publish oms**: `pack`, then `verify` on three platforms, then `stage`.
4. Approve what it staged, with your second factor:

   ```bash
   npm stage list @motionhub/oms
   npm stage approve <stage-id>
   ```

A tag that names another version than `package.json`, or a commit main does not hold, stops at `pack`. A failed
`verify` stages nothing: fix it on main and tag a new version, since a published version never changes.

## Once, before the first version

npm sets a trusted publisher only on a package that exists, so the first version is staged by hand.

1. Create the GitHub environment `npm-release` in the repository's settings (Environments), with the maintainers as
   required reviewers if you want a second look before a version is staged.
2. Push the tag `oms-v0.1.0`. `pack` and `verify` pass; `stage` fails, since npm has no trusted publisher for the
   package yet.
3. Download the run's `oms-tarball` artifact and stage that tarball, signed in to npm as a maintainer of the
   `@motionhub` scope (npm 11.15 or later):

   ```bash
   npm stage publish motionhub-oms-0.1.0.tgz
   npm stage approve <stage-id>
   ```

4. On npmjs.com, in `@motionhub/oms`'s settings, add a trusted publisher:
   - GitHub Actions;
   - organisation `motionhubdev`, repository `openmotionstudio`;
   - workflow `publish-oms.yml`, environment `npm-release`.

   It must publish within two days of being saved, or it expires: the next version's tag is that publish, so add it
   when that version is ready.

From then on, every version is the steps above.
