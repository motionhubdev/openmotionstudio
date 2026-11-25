# OMS for Claude Code and Codex

The `oms` command and its skill let Claude Code or Codex author a film folder that the Studio opens as it is. Install
it from npm (Node 22.12 or newer), then its skill for your host:

    npm install -g @motionhub/oms && oms install claude
    npm install -g @motionhub/oms && oms install codex

Or take the skill with the `skills` installer, for Claude Code, Codex and the other agents it knows, and the command
from npm. The skill then comes from this repository's main branch, so it can be newer than the command: `oms install`
keeps the two the same version.

    npx skills add motionhubdev/openmotionstudio --skill oms -g
    npm install -g @motionhub/oms

To try this repository's own version, pack it instead: `pnpm install`, then `cd apps/cli && npm pack`, and install
the `motionhub-oms-<version>.tgz` it writes.

Start a new host session. Ask “Use OMS to make a 20-second portrait film from these screenshots. Hold the download address for the final two seconds.” The skill installs in the host's user skills directory and respects CLAUDE_CONFIG_DIR or CODEX_HOME. To upgrade, install the new version, move the previous host skills/oms folder aside, then rerun the install command.

    oms init "My Film"
    oms check "My Film" --json
    oms still "My Film" --at 1.5 --out frame.png
    oms render "My Film" --out film.mp4
    oms player "My Film" --out "My Film web"
    oms pack "My Film"
    oms preview "My Film"
    oms motion search ink
    oms motion use @iamsuosi/plumb-line "My Film"
    oms sound "My Film" --cues "0.5:land, 2:count" --seconds 6 --out "My Film/media/effects.wav"
    oms font "My Film" --family "Noto Sans SC" --weights 400,700
    MINIMAX_API_KEY=… MINIMAX_REGION=china oms voice "My Film"
    oms voice --list minimax
    oms voice "My Film" --recording take.m4a

Render renders with your own ffmpeg (OMS_FFMPEG, else the one on the PATH; brew install ffmpeg, apt-get install ffmpeg or winget install Gyan.FFmpeg) and says what is missing when it lacks x264 or another part a render needs. Player writes a new folder that plays the film in a browser without rendering it: put it on any static web host, or open its index.html from disk; its sound is one soundtrack your ffmpeg mixes. Preview plays the same at http://127.0.0.1:4173/ (--port for another) and builds it again when a project file changes. Voice speaks the film's lines in its <Film voice> into voice/, as the Studio does, with the provider's key from the environment (MINIMAX_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY or AZURE_SPEECH_KEY with AZURE_SPEECH_REGION); only lines whose words changed are spoken again, and each costs what the provider charges. With --recording, a take of the lines read by you is transcribed (MiniMax, OpenAI or ElevenLabs, once a take: the transcript is kept in ~/.cache/oms/transcripts), matched to the lines and cut into voice/ instead, in a film whose voice is recording:take; it says who transcribed it, every line read otherwise than written (still cut, its caption showing the written words) and anything said between the lines (left out). Font takes a face from Google Fonts (fonts.googleapis.com) cut to the characters the film writes (its sources, and words it imports from outside its folder), into its media/fonts/ with its licence; run it again when the words change. Open the project folder in Studio to refine it, if you like, or pack it as one film file (My Film.oms, beside the folder, or --out) that Studio's Import project opens as a new project: the project's own files, without renders, stills, dot-folders (a tool's cache, say; oms says which it left out) or the Studio's state. A version of oms carries the player, runtime and film format of the Studio it was released with, so a film it makes may need a Studio at least as new. An editable 20-second example, one film.tsx drawn from code alone, is in the skill's example folder. Films are drawn in chrome-headless-shell, the build HyperFrames pins (an older one on macOS 12): oms uses the one HyperFrames or Puppeteer already downloaded, or downloads it once (about 100 MB) into ~/.cache/puppeteer, and OMS_CHROME names another. Linux on Arm has no headless shell: install Chromium with the system package manager (for example sudo apt-get install chromium) and oms uses it. It draws WebGL on the GPU where that Chrome can (SwiftShader otherwise) and says which; OMS_RENDER_GPU=0 asks for the CPU, =1 for the GPU. It needs no display. Chrome's sandbox is on where it can start; as root, in a container or where it cannot start oms runs Chrome without it and says so (OMS_CHROME_SANDBOX=1 requires it, =0 turns it off). Each run uses its own temporary profile and build directory. Check exits nonzero for film errors. Still writes a new PNG.

To run the installed-package regression test, pass the installed package directory to
`node apps/cli/scripts/test-installed.mjs <installed-package-directory>` from the repository.
