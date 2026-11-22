# OMS for Claude Code and Codex

## Standard skill installation

With Node.js 22.12+ and npm installed, run this in your project:

    npx skills add motionhubdev/openmotionstudio --skill oms --agent claude-code codex

Select a single host by passing only its name. Add `-g` for user-wide installation. Start a new host session. The skill includes the film reference and a version-matched CLI archive. On first use, npm downloads the CLI dependencies to its cache. Preview downloads Electron and requires a graphical session on Linux. Install OpenMotionStudio when you want to refine or export the project.

To test a checkout before it reaches the default branch, substitute the absolute path to the checkout for `motionhubdev/openmotionstudio`.

## Global CLI installation

Download the CLI tarball and run one line for your host:

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

After changing the CLI, shared player or film contract, run `npm run sync-skill` in apps/cli and commit the updated skill assets.
