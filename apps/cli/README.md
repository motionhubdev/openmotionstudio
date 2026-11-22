# OMS for Claude Code and Codex

Download the CLI tarball and run one line for your host (Node 22.12 or newer).

    npm install -g ./open-motion-studio-skill-0.1.0.tgz && oms install claude
    npm install -g ./open-motion-studio-skill-0.1.0.tgz && oms install codex

Start a new host session. Ask “Use OMS to make a 20-second portrait film from these screenshots. Hold the download address for the final two seconds.” The skill installs in the host's user skills directory and respects CLAUDE_CONFIG_DIR or CODEX_HOME. To upgrade, install the new tarball, move the previous host skills/oms folder aside, then rerun the install command.

    oms init "My Film"
    oms check "My Film" --json
    oms still "My Film" --at 1.5 --out frame.png

Open the project folder in Studio to edit or export. This build targets Studio 0.1.3 and MotionHub runtime 0.8.0. An editable 20-second example is in dist/example inside the package. The first preview downloads the matching Electron binary. Linux needs a graphical session (a virtual display also works) and Electron's normal system dependencies. Each run uses its own temporary profile and build directory. Check exits nonzero for film errors. Still writes a new PNG.

From the repository, run pnpm install and then npm pack in apps/cli to build a distributable tarball.

To run the installed-package regression test, pass the installed package directory to
`node apps/cli/scripts/test-installed.mjs <installed-package-directory>` from the repository.
