import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import ffmpegStatic from 'ffmpeg-static';
import { COVER_SIDE, SCENE_STILLS, type Stage, exportFrames, jpegSize, sceneStills, stillsDir } from '../capture';
import { buildDir } from '../film';
import type { FilmInfo } from '../../../shared/preview';

vi.mock('electron', () => ({}));

const film = {
  width: 1920,
  height: 1080,
  fps: 30,
  seconds: 6,
  scenes: [
    { id: 'intro', start: 0, duration: 4, layers: [], lines: [] },
    { id: 'outro', start: 4, duration: 2, layers: [], lines: [] },
  ],
  layers: [],
} as unknown as FilmInfo;

/** A stage that photographs nothing: each frame is the time it was asked for. */
function fakeStage() {
  const times: number[] = [];
  const stage: Stage = {
    film,
    frame: async (t) => {
      times.push(t);
      const bytes = Buffer.from(`frame at ${t}`);
      return { getSize: () => ({ width: film.width, height: film.height }), resize: () => ({ toJPEG: () => bytes }) } as never;
    },
    png: async () => Buffer.from(''),
    inspect: async () => ({ outside: [], unloaded: [] }),
    close: vi.fn(),
  };
  return { stage, times, open: vi.fn(async () => stage) };
}

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-stills-'));
  await mkdir(buildDir(dir), { recursive: true });
  await writeFile(join(buildDir(dir), 'film-1.js'), 'the first film');
  await writeFile(join(buildDir(dir), 'film-2.js'), 'the second film');
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('the scenes photographed for the timeline', () => {
  it('takes each scene evenly through it, and closes the stage', async () => {
    const { open, times, stage } = fakeStage();
    const stills = await sceneStills(dir, 1, open);
    expect(Object.keys(stills)).toEqual(['intro', 'outro']);
    expect(stills.intro).toHaveLength(SCENE_STILLS);
    expect(stills.intro![0]).toMatch(/^data:image\/jpeg;base64,/);
    expect(times.slice(0, SCENE_STILLS)).toEqual([1 / 3, 1, 5 / 3, 7 / 3, 3, 11 / 3]);
    expect(times[SCENE_STILLS]).toBeCloseTo(4 + 1 / 6);
    expect(stage.close).toHaveBeenCalled();
  });

  it('takes the cover once, sharper than the frames, from the first scene after its entrance', async () => {
    const { open, times } = fakeStage();
    const widths: number[] = [];
    const stage = await open();
    const frame = stage.frame;
    stage.frame = async (t) => {
      const image = await frame(t);
      return { getSize: image.getSize, resize: ({ width }: { width: number }) => (widths.push(width), image.resize({ width })) } as never;
    };
    await sceneStills(dir, 1, async () => stage);
    expect(times.at(-1)).toBeCloseTo(0.6 * 4);
    expect(widths.at(-1)).toBe(COVER_SIDE);
    expect(String(await readFile(join(dir, '.motion-studio', 'cover.jpg')))).toBe(`frame at ${times.at(-1)}`);

    await rm(join(dir, '.motion-studio', 'cover.jpg'));
    const again = fakeStage();
    await sceneStills(dir, 1, again.open);
    expect(again.times).toHaveLength(1);
    expect(again.stage.close).toHaveBeenCalled();
    expect(String(await readFile(join(dir, '.motion-studio', 'cover.jpg')))).toBe(`frame at ${again.times[0]}`);
  });

  it('takes again a cover kept smaller than the Studio takes them now, and keeps one as large', async () => {
    const jpeg = (width: number, height: number) => {
      const sof = Buffer.from([0xff, 0xc0, 0, 17, 8, 0, 0, 0, 0, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
      sof.writeUInt16BE(height, 5);
      sof.writeUInt16BE(width, 7);
      return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0]), sof]);
    };
    expect(jpegSize(jpeg(640, 1138))).toEqual({ width: 640, height: 1138 });
    expect(jpegSize(Buffer.from('not a picture'))).toBeNull();
    await sceneStills(dir, 1, fakeStage().open);
    await writeFile(join(dir, '.motion-studio', 'cover.jpg'), jpeg(640, 1138));
    const small = fakeStage();
    await sceneStills(dir, 1, small.open);
    expect(small.times).toHaveLength(1);
    await writeFile(join(dir, '.motion-studio', 'cover.jpg'), jpeg(720, 1280));
    const large = fakeStage();
    await sceneStills(dir, 1, large.open);
    expect(large.open).not.toHaveBeenCalled();
  });

  it('keeps one file, in .motion-studio/thumbs, and photographs the same build only once', async () => {
    const first = fakeStage();
    const stills = await sceneStills(dir, 1, first.open);
    expect(await readdir(stillsDir(dir))).toEqual([expect.stringMatching(/^[0-9a-f]{16}\.json$/)]);
    expect(stillsDir(dir)).toBe(join(dir, '.motion-studio', 'thumbs'));

    const again = fakeStage();
    expect(await sceneStills(dir, 1, again.open)).toEqual(stills);
    expect(again.open).not.toHaveBeenCalled();
  });

  it('a new build replaces the last one’s file and touches nothing else', async () => {
    await sceneStills(dir, 1, fakeStage().open);
    const [old] = await readdir(stillsDir(dir));
    await sceneStills(dir, 2, fakeStage().open);
    const kept = await readdir(stillsDir(dir));
    expect(kept).toHaveLength(1);
    expect(kept[0]).not.toBe(old);
    expect((await readdir(buildDir(dir))).sort()).toEqual(['film-1.js', 'film-2.js']);
  });

  it('writes nothing when the film fails to draw', async () => {
    const { stage } = fakeStage();
    stage.frame = async () => {
      throw new Error('The frame at 1.00 s took longer than 60 s.');
    };
    await expect(sceneStills(dir, 1, async () => stage)).rejects.toThrow('took longer');
    expect(stage.close).toHaveBeenCalled();
    await expect(readdir(stillsDir(dir))).rejects.toThrow();
    await expect(readFile(join(dir, '.motion-studio', 'cover.jpg'))).rejects.toThrow();
  });
});

describe('an export drawn by several stages', () => {
  const small = { ...film, width: 32, height: 16, fps: 10, seconds: 3, sounds: [], narration: [], lines: [], scenes: [{ id: 'all', start: 0, duration: 3, layers: [], lines: [] }] } as unknown as FilmInfo;
  const ffmpeg = ffmpegStatic as unknown as string;

  /** A PNG of one colour, from the frame's time, so each frame differs and its place in the video can be checked. */
  function png(t: number): Buffer {
    const crc = (bytes: Buffer) => {
      let c = ~0;
      for (const byte of bytes) for (let k = 0, x = (c ^ byte) & 0xff; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1, k === 7 && (c = (c >>> 8) ^ x);
      return ~c >>> 0;
    };
    const chunk = (type: string, data: Buffer) => {
      const body = Buffer.concat([Buffer.from(type), data]);
      const out = Buffer.alloc(12 + data.length);
      out.writeUInt32BE(data.length, 0);
      body.copy(out, 4);
      out.writeUInt32BE(crc(body), 8 + data.length);
      return out;
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(small.width, 0);
    header.writeUInt32BE(small.height, 4);
    header.set([8, 2, 0, 0, 0], 8);
    const shade = Math.round((t / small.seconds) * 255);
    const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(small.width * 3, shade)]);
    const pixels = deflateSync(Buffer.concat(Array.from({ length: small.height }, () => row)));
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', pixels), chunk('IEND', Buffer.alloc(0))]);
  }

  /** Stages that draw each frame after a random wait, so they finish out of order; `fail` makes one throw at a frame. */
  function stages(fail?: number) {
    const opened: { close: ReturnType<typeof vi.fn> }[] = [];
    const open = vi.fn(async () => {
      const stage = {
        film: small,
        png: async (t: number) => {
          await new Promise((done) => setTimeout(done, Math.random() * 5));
          if (fail !== undefined && Math.round(t * small.fps) === fail) throw new Error(`No frame ${fail}`);
          return png(t);
        },
        inspect: async () => ({ outside: [], unloaded: [] }),
        close: vi.fn(),
      };
      opened.push(stage);
      return stage;
    });
    return { open, opened };
  }

  const frames = (file: string) =>
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', file, '-f', 'framemd5', '-'], { encoding: 'utf8' })
      .split('\n')
      .filter((line) => line && !line.startsWith('#'));

  it('writes the same video however many stages draw it, and closes every one', async () => {
    const one = stages();
    await exportFrames(dir, 1, join(dir, 'one.mp4'), () => {}, new AbortController().signal, one.open, ffmpeg, { output: dir, stages: 1 });
    const three = stages();
    await exportFrames(dir, 1, join(dir, 'three.mp4'), () => {}, new AbortController().signal, three.open, ffmpeg, { output: dir, stages: 3 });
    expect(three.open).toHaveBeenCalledTimes(3);
    expect(three.opened.every((stage) => stage.close.mock.calls.length === 1)).toBe(true);
    expect(frames(join(dir, 'three.mp4'))).toEqual(frames(join(dir, 'one.mp4')));
    expect(frames(join(dir, 'one.mp4'))).toHaveLength(small.seconds * small.fps);
  }, 30_000);

  it('stops every stage at the first failure, and leaves no video', async () => {
    const failing = stages(7);
    const file = join(dir, 'failed.mp4');
    await expect(exportFrames(dir, 1, file, () => {}, new AbortController().signal, failing.open, ffmpeg, { output: dir, stages: 3 })).rejects.toThrow('No frame 7');
    expect(failing.opened.every((stage) => stage.close.mock.calls.length === 1)).toBe(true);
    expect((await readdir(dir)).filter((name) => name.startsWith('failed'))).toEqual([]);
  }, 30_000);

  it('joins its segments as they are, and resumes from the ones a stopped export finished', async () => {
    const resume = join(dir, 'resume');
    const file = join(dir, 'resumed.mp4');
    const output = join(dir, 'bundle');
    await mkdir(output);
    await writeFile(join(output, 'film-1.js'), 'the film');
    const failing = stages(25);
    await expect(
      exportFrames(dir, 1, file, () => {}, new AbortController().signal, failing.open, ffmpeg, { output, stages: 2, resume, segmentFrames: 10 }),
    ).rejects.toThrow('No frame 25');
    const [kept] = await readdir(resume);
    expect((await readdir(join(resume, kept!))).sort()).toEqual(['0000000-0000010.mp4', '0000010-0000020.mp4']);
    expect((await readdir(dir)).filter((name) => name.startsWith('resumed'))).toEqual([]);

    const drawn: number[] = [];
    const counting = stages();
    const open = vi.fn(async (version: number) => {
      const stage = await counting.open();
      return { ...stage, png: async (t: number) => (drawn.push(Math.round(t * small.fps)), stage.png(t)) };
    });
    await exportFrames(dir, 1, file, () => {}, new AbortController().signal, open, ffmpeg, { output, stages: 2, resume, segmentFrames: 10 });
    expect(Math.min(...drawn)).toBe(20);
    expect(drawn).toHaveLength(10);
    expect(frames(file)).toHaveLength(small.seconds * small.fps);
    expect(await readdir(resume)).toEqual([]);
  }, 60_000);

  it('makes the same length of video in segments as in one', async () => {
    const many = stages();
    await exportFrames(dir, 1, join(dir, 'many.mp4'), () => {}, new AbortController().signal, many.open, ffmpeg, { output: dir, stages: 3, segmentFrames: 7 });
    expect(frames(join(dir, 'many.mp4'))).toHaveLength(small.seconds * small.fps);
    const probe = (() => { try { return execFileSync(ffmpeg, ['-hide_banner', '-i', join(dir, 'many.mp4')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (error) { return String((error as { stderr: string }).stderr); } })();
    expect(probe).toMatch(/Duration: 00:00:03\.0/);
    expect((await readdir(dir)).filter((name) => name.includes('partial'))).toEqual([]);
  }, 60_000);

  it('is cancelled between frames', async () => {
    const cancel = new AbortController();
    const drawn = stages();
    const file = join(dir, 'cancelled.mp4');
    const done = exportFrames(dir, 1, file, (share) => share > 0.3 && cancel.abort(), cancel.signal, drawn.open, ffmpeg, { output: dir, stages: 2 });
    await expect(done).rejects.toThrow('cancelled');
    expect(drawn.opened.every((stage) => stage.close.mock.calls.length === 1)).toBe(true);
    expect((await readdir(dir)).filter((name) => name.startsWith('cancelled'))).toEqual([]);
  }, 30_000);
});
