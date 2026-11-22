# OMS for Claude Code and Codex

The `oms` command and its skill let Claude Code or Codex author a film folder that the Studio opens as it is. No
release publishes the package yet: build its tarball from this repository (Node 22.12 or newer), then install it and
the skill for your host.

    pnpm install
    cd apps/cli && npm pack
    npm install -g ./open-motion-studio-skill-<version>.tgz && oms install claude
    npm install -g ./open-motion-studio-skill-<version>.tgz && oms install codex

Start a new host session. Ask “Use OMS to make a 20-second portrait film from these screenshots. Hold the download address for the final two seconds.” The skill installs in the host's user skills directory and respects CLAUDE_CONFIG_DIR or CODEX_HOME. To upgrade, install the new tarball, move the previous host skills/oms folder aside, then rerun the install command.

    oms init "My Film"
    oms check "My Film" --json
    oms still "My Film" --at 1.5 --out frame.png

Open the project folder in Studio to edit or export. A tarball carries the player, runtime and film format of the Studio it was packed from, so pack it from the commit of the Studio you use. An editable 20-second example, one film.tsx drawn from code alone, is in dist/example inside the package. The first preview downloads the matching Electron binary. On a Linux server without a display it draws headless, with no X server; it needs Electron's normal system libraries and an ordinary user, since the player's sandbox does not run as root. Each run uses its own temporary profile and build directory. Check exits nonzero for film errors. Still writes a new PNG.

To run the installed-package regression test, pass the installed package directory to
`node apps/cli/scripts/test-installed.mjs <installed-package-directory>` from the repository.
