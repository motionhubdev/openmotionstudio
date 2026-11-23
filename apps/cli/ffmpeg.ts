// The ffmpeg oms renders with: the person's own, as HyperFrames and VisoTalk use one (OMS_FFMPEG, else the first on the
// PATH), checked for everything the Studio's export asks of it (capture.ts, mix.ts) before a frame is drawn. The Studio
// ships its own (ffmpeg-static); oms ships none.

import { execFile } from 'node:child_process';
import { statSync } from 'node:fs';
import { delimiter, join } from 'node:path';

/** The encoders, decoders and filters an export uses: H.264 and AAC out, PNG frames in, subtitles, and the mix's graph. */
export const NEEDS = {
  encoder: ['libx264', 'aac', 'mov_text'],
  decoder: ['png'],
  filter: ['scale', 'format', 'adelay', 'afade', 'aformat', 'alimiter', 'aloop', 'amix', 'aresample', 'asetpts', 'atrim', 'volume'],
} as const;

/** The first `name` on the PATH, with Windows' executable extensions. */
export function onPath(name: string, env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string | undefined {
  const extensions = platform === 'win32' ? (env.PATHEXT ?? '.EXE').split(';').filter(Boolean) : [''];
  for (const dir of (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const file = join(dir, name + extension.toLowerCase());
      try {
        if (statSync(file).isFile()) return file;
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

/** The names `ffmpeg -encoders`, `-decoders` or `-filters` lists: each line's second word, after its flags. */
export function listed(output: string): Set<string> {
  const names = new Set<string>();
  for (const line of output.split('\n')) {
    const [flags, name] = line.trim().split(/\s+/);
    if (flags && name && /^[A-Z.|]+$/.test(flags)) names.add(name);
  }
  return names;
}

/** What `NEEDS` asks that these lists lack, as "encoder libx264". */
export function lacking(have: Record<keyof typeof NEEDS, Set<string>>): string[] {
  return (Object.keys(NEEDS) as (keyof typeof NEEDS)[]).flatMap((kind) => NEEDS[kind].filter((name) => !have[kind].has(name)).map((name) => `${kind} ${name}`));
}

/** How to install ffmpeg here. */
export function installHint(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'darwin') return 'brew install ffmpeg';
  if (platform === 'win32') return 'winget install --id Gyan.FFmpeg -e';
  return "sudo apt-get install ffmpeg, or your distribution's ffmpeg package";
}

const listOf = (ffmpeg: string, kind: string) =>
  new Promise<Set<string>>((done, fail) =>
    execFile(ffmpeg, ['-hide_banner', `-${kind}s`], { maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (error, stdout) =>
      error ? fail(new Error(`${ffmpeg} could not be run: ${error.message}`)) : done(listed(stdout)),
    ),
  );

/** The ffmpeg to render with, once it is known to have all an export needs. */
export async function findFfmpeg(): Promise<string> {
  const named = process.env.OMS_FFMPEG;
  const ffmpeg = named || onPath('ffmpeg');
  if (!ffmpeg) throw new Error(`oms renders with ffmpeg, which is not on the PATH. Install it (${installHint()}), or name one in OMS_FFMPEG.`);
  const [encoder, decoder, filter] = await Promise.all([listOf(ffmpeg, 'encoder'), listOf(ffmpeg, 'decoder'), listOf(ffmpeg, 'filter')]);
  const gaps = lacking({ encoder, decoder, filter });
  if (gaps.length) {
    throw new Error(`The ffmpeg at ${ffmpeg} has no ${gaps.join(', ')}, which a render needs. Install a full build (${installHint()}), or name one in OMS_FFMPEG.`);
  }
  return ffmpeg;
}
