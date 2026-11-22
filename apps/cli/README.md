# OMS for Claude Code and Codex

The `oms` command and its skill let Claude Code or Codex author a film folder that the Studio opens as it is. No
release publishes the package yet: build its tarball from this repository (Node 22.12 or newer), then install it and
the skill for your host.

    pnpm install
    cd apps/cli && npm pack
    npm install -g ./motionhub-oms-<version>.tgz && oms install claude
    npm install -g ./motionhub-oms-<version>.tgz && oms install codex

Start a new host session. Ask “Use OMS to make a 20-second portrait film from these screenshots. Hold the download address for the final two seconds.” The skill installs in the host's user skills directory and respects CLAUDE_CONFIG_DIR or CODEX_HOME. To upgrade, install the new tarball, move the previous host skills/oms folder aside, then rerun the install command.

    oms init "My Film"
    oms check "My Film" --json
    oms still "My Film" --at 1.5 --out frame.png
    oms render "My Film" --out film.mp4
    oms motion search ink
    oms motion use @iamsuosi/plumb-line "My Film"

Render renders with your own ffmpeg (OMS_FFMPEG, else the one on the PATH; brew install ffmpeg, apt-get install ffmpeg or winget install Gyan.FFmpeg) and says what is missing when it lacks x264 or another part a render needs. Open the project folder in Studio to refine it, if you like. A tarball carries the player, runtime and film format of the Studio it was packed from, so pack it from the commit of the Studio you use. An editable 20-second example, one film.tsx drawn from code alone, is in dist/example inside the package. Films are drawn in chrome-headless-shell, the build HyperFrames pins (an older one on macOS 12): oms uses the one HyperFrames or Puppeteer already downloaded, or downloads it once (about 100 MB) into ~/.cache/puppeteer, and OMS_CHROME names another. Linux on Arm has no headless shell: install Chromium with the system package manager (for example sudo apt-get install chromium) and oms uses it. It needs no display. Chrome's sandbox is on where it can start; as root, in a container or where it cannot start oms runs Chrome without it and says so (OMS_CHROME_SANDBOX=1 requires it, =0 turns it off). Each run uses its own temporary profile and build directory. Check exits nonzero for film errors. Still writes a new PNG.

To run the installed-package regression test, pass the installed package directory to
`node apps/cli/scripts/test-installed.mjs <installed-package-directory>` from the repository.
