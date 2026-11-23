import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installHint, lacking, listed, NEEDS, onPath } from '../ffmpeg';

let scratch: string;
beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'oms-ffmpeg-'));
});
afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe('listed', () => {
  it('reads the names ffmpeg lists after their flags, and not the legend', () => {
    const encoders = ` V..... = Video\n A..... = Audio\n ------\n V....D libx264              libx264 H.264 / AVC\n A....D aac                  AAC (Advanced Audio Coding)\n`;
    const filters = `Filters:\n  T.. = Timeline support\n T.C adelay            A->A       Delay one or more audio channels.\n ... amix              N->A       Audio mixing.\n`;
    expect([...listed(encoders)].filter((name) => name !== '=')).toEqual(['libx264', 'aac']);
    expect([...listed(filters)].filter((name) => name !== '=')).toEqual(['adelay', 'amix']);
  });
});

describe('lacking', () => {
  const all = { encoder: new Set<string>(NEEDS.encoder), decoder: new Set<string>(NEEDS.decoder), filter: new Set<string>(NEEDS.filter) };

  it('finds nothing missing in an ffmpeg that has all a render uses', () => {
    expect(lacking(all)).toEqual([]);
  });

  it('names each encoder, decoder or filter a build lacks, as a distribution without x264 would', () => {
    const encoder = new Set(['aac', 'mov_text']);
    const filter = new Set([...NEEDS.filter].filter((name) => name !== 'alimiter'));
    expect(lacking({ ...all, encoder, filter })).toEqual(['encoder libx264', 'filter alimiter']);
  });
});

describe('onPath', () => {
  it('finds the first file of that name on the PATH, and nothing that is a folder or missing', async () => {
    const first = join(scratch, 'a');
    const second = join(scratch, 'b');
    await mkdir(join(first, 'ffmpeg'), { recursive: true }); // a folder named ffmpeg is not it
    await mkdir(second, { recursive: true });
    await writeFile(join(second, 'ffmpeg'), '#!/bin/sh\n');
    await chmod(join(second, 'ffmpeg'), 0o755);
    expect(onPath('ffmpeg', { PATH: [first, second].join(delimiter) }, 'linux')).toBe(join(second, 'ffmpeg'));
    expect(onPath('ffmpeg', { PATH: first }, 'linux')).toBeUndefined();
    expect(onPath('ffmpeg', {}, 'linux')).toBeUndefined();
  });

  it("adds Windows' executable extensions", async () => {
    await writeFile(join(scratch, 'ffmpeg.exe'), '');
    expect(onPath('ffmpeg', { Path: scratch, PATHEXT: '.COM;.EXE' }, 'win32')).toBe(join(scratch, 'ffmpeg.exe'));
  });
});

describe('installHint', () => {
  it('says how each system installs ffmpeg', () => {
    expect(installHint('darwin')).toBe('brew install ffmpeg');
    expect(installHint('win32')).toContain('winget');
    expect(installHint('linux')).toContain('apt-get');
  });
});
