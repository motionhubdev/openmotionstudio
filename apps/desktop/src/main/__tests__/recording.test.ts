import ffmpegStatic from 'ffmpeg-static';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FilmInfo } from '../../shared/preview';
import { alignLines, captionWords, languageOf, transcribe, voiceRecording } from '../recording';
import type { VoiceIo, Word } from '../voice';

const ffmpeg = ffmpegStatic as unknown as string;
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-recording-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

/** Words heard a character at a time, as MiniMax gives Chinese, from `at`, each `step` long. */
const heardAt = (text: string, at: number, step = 0.25): Word[] =>
  [...text].filter((c) => /[\p{L}\p{N}]/u.test(c)).map((c, i) => ({ text: c, start: at + i * step, end: at + (i + 1) * step }));

describe('captionWords', () => {
  it('makes each unspaced character a word, each run of letters one, and keeps marks with the word before', () => {
    expect(captionWords('潮汐，来自月球。').map((w) => w.text)).toEqual(['潮', '汐，', '来', '自', '月', '球。']);
    expect(captionWords('Tides come twice, a day.').map((w) => w.text)).toEqual(['Tides', 'come', 'twice,', 'a', 'day.']);
    expect(captionWords('“为什么”有 2 次？').map((w) => [w.text, w.spoken.join('')])).toEqual([['“为', '为'], ['什', '什'], ['么”', '么'], ['有', '有'], ['2', '2'], ['次？', '次']]);
  });

  it('says which language a script is in', () => {
    expect(['潮汐是怎么来的', 'Why tides', 'しお', '조수'].map(languageOf)).toEqual(['zh', 'en', 'ja', 'ko']);
  });
});

describe('alignLines', () => {
  const lines = [
    { id: 'a', text: '潮汐是怎么来的？' },
    { id: 'b', text: '答案在月球。' },
  ];

  it('finds each line where it was read, its words timed by the characters heard for them', () => {
    const heard = [...heardAt('潮汐是怎么来的', 0.5), ...heardAt('答案在月球', 3)];
    const [a, b] = alignLines(lines, heard);
    expect(a).toMatchObject({ id: 'a', start: 0.5, end: 2.25, heard: 1, said: '潮汐是怎么来的' });
    expect(a!.words.at(-1)).toEqual({ text: '的？', start: 2, end: 2.25 });
    expect(b).toMatchObject({ start: 3, end: 4.25, heard: 1 });
  });

  it('keeps a line read with a word changed, and with a pause filled, where it was read', () => {
    const heard = [...heardAt('潮汐是怎样来的', 0), ...heardAt('嗯', 2), ...heardAt('答案在月球', 3)];
    const [a, b] = alignLines(lines, heard);
    expect(a!.heard).toBeCloseTo(6 / 7);
    expect(a!.words[4]).toEqual({ text: '么', start: 1, end: 1.25 }); // heard as 样, at its time
    expect(b).toMatchObject({ start: 3, heard: 1 });
  });

  it('says a line left out as not heard, and times its words between its neighbours', () => {
    const heard = [...heardAt('潮汐是怎么来的', 0), ...heardAt('海水涨了', 3)];
    const [, b] = alignLines([...lines, { id: 'c', text: '海水涨了。' }], heard).slice(1);
    expect(b).toMatchObject({ id: 'c', heard: 1 });
    const [, missing] = alignLines([...lines, { id: 'c', text: '海水涨了。' }], heard);
    expect(missing!.heard).toBe(0);
    expect(missing!.start).toBeGreaterThanOrEqual(1.75);
    expect(missing!.end).toBeLessThanOrEqual(3);
  });

  it('matches English by its letters, whatever the case and marks', () => {
    const heard: Word[] = [
      { text: 'Tides', start: 0, end: 0.4 },
      { text: 'come', start: 0.4, end: 0.7 },
      { text: 'twice', start: 0.7, end: 1.1 },
    ];
    const [line] = alignLines([{ id: 'x', text: 'Tides come twice!' }], heard);
    expect(line!.words).toEqual([
      { text: 'Tides', start: 0, end: 0.4 },
      { text: 'come', start: 0.4, end: 0.7 },
      { text: 'twice!', start: 0.7, end: 1.1 },
    ]);
  });
});

/** Answers each request as `answer` gives, and keeps what was asked. */
function io(answer: (url: string, body: FormData) => unknown) {
  const asked: { url: string; headers: Record<string, string>; body: FormData }[] = [];
  return {
    asked,
    io: {
      fetch: async (url: string, init: { headers: Record<string, string>; body: FormData }) => {
        asked.push({ url, headers: init.headers, body: init.body });
        return new Response(JSON.stringify(answer(url, init.body)));
      },
      WebSocket: class {} as never,
    } as unknown as VoiceIo,
  };
}

describe('transcribe', () => {
  it("asks each provider for each word's time and reads its answer into one shape", async () => {
    const mini = io(() => ({ segments: [{ text: '潮', start: 0.1, end: 0.3 }, { text: ' ', start: 0.3, end: 0.3 }], base_resp: { status_code: 0 } }));
    expect(await transcribe({ kind: 'minimax', key: 'k', region: 'china' }, Buffer.from('flac'), 'zh', mini.io)).toEqual([{ text: '潮', start: 0.1, end: 0.3 }]);
    expect(mini.asked[0]!.url).toBe('https://api.minimaxi.com/v1/speech_to_text?language=zh');
    expect(mini.asked[0]!.headers).toEqual({ Authorization: 'Bearer k' });
    expect([mini.asked[0]!.body.get('model'), mini.asked[0]!.body.get('timestamp_level')]).toEqual(['asr-1.0', 'word']);

    const open = io(() => ({ words: [{ word: ' Tides', start: 0, end: 0.4 }] }));
    expect(await transcribe({ kind: 'openai', key: 'k' }, Buffer.from('flac'), 'en', open.io)).toEqual([{ text: 'Tides', start: 0, end: 0.4 }]);
    expect(open.asked[0]!.body.getAll('timestamp_granularities[]')).toEqual(['word']);

    const eleven = io(() => ({ words: [{ text: 'Tides', start: 0, end: 0.4, type: 'word' }, { text: ' ', start: 0.4, end: 0.5, type: 'spacing' }] }));
    expect(await transcribe({ kind: 'elevenlabs', key: 'k' }, Buffer.from('flac'), 'en', eleven.io)).toEqual([{ text: 'Tides', start: 0, end: 0.4 }]);
    expect(eleven.asked[0]!.headers).toEqual({ 'xi-api-key': 'k' });

    await expect(transcribe({ kind: 'azure', key: 'k', region: 'x' }, Buffer.from(''), 'en')).rejects.toThrow('does not transcribe');
  });
});

describe('voiceRecording', () => {
  /** A take of `seconds` of tone, as a WAV the transcriber is said to have heard. */
  async function take(seconds: number): Promise<string> {
    const file = join(dir, 'take.wav');
    const rate = 16000;
    const pcm = Buffer.alloc(seconds * rate * 2);
    for (let i = 0; i < seconds * rate; i++) pcm.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 330 * i) / rate) * 6000), i * 2);
    const head = Buffer.alloc(44);
    head.write('RIFF', 0);
    head.writeUInt32LE(36 + pcm.length, 4);
    head.write('WAVEfmt ', 8);
    head.writeUInt32LE(16, 16);
    head.writeUInt16LE(1, 20);
    head.writeUInt16LE(1, 22);
    head.writeUInt32LE(rate, 24);
    head.writeUInt32LE(rate * 2, 28);
    head.writeUInt16LE(2, 32);
    head.writeUInt16LE(16, 34);
    head.write('data', 36);
    head.writeUInt32LE(pcm.length, 40);
    await writeFile(file, Buffer.concat([head, pcm]));
    return file;
  }

  const film = (voice: string | null): Pick<FilmInfo, 'scenes' | 'voice'> => ({
    voice,
    scenes: [{ id: 's', start: 0, duration: 6, layers: [], lines: [{ id: 'a', text: '潮汐是怎么来的？', start: 0, end: 3 }, { id: 'b', text: '答案在月球。', start: 3, end: 6 }] }],
  });

  it('cuts one clip a line into voice/, its words the script’s own, and asks the provider once for the same take', async () => {
    const file = await take(6);
    const heard = { segments: [...heardAt('潮汐是怎么来的', 0.5), ...heardAt('答案在月球', 3)], base_resp: { status_code: 0 } };
    const minimax = io(() => heard);
    const cache = join(dir, 'cache');
    const project = join(dir, 'project');
    const done = await voiceRecording(project, film('recording:take'), file, { kind: 'minimax', key: 'k', region: 'china' }, ffmpeg, cache, () => {}, minimax.io);
    expect(done).toMatchObject({ lines: 2, heard: 1 });
    const lines = JSON.parse(await readFile(join(project, 'voice', 'lines.json'), 'utf8')) as { voice: string; lines: Record<string, string> };
    expect(lines.voice).toBe('recording:take');
    const clip = JSON.parse(await readFile(join(project, 'voice', `${lines.lines.a}.json`), 'utf8'));
    expect(clip).toMatchObject({ text: '潮汐是怎么来的？', voice: 'recording:take' });
    // Cut from 0.38 s (0.12 s before its first word): its words start 0.12 s in.
    expect(clip.words[0]).toEqual({ text: '潮', start: 0.12, end: 0.37 });
    expect(clip.words.map((w: { text: string }) => w.text).join('')).toBe('潮汐是怎么来的？');
    expect(clip.seconds).toBeGreaterThan(1.8);
    expect((await readdir(join(project, 'voice'))).filter((f) => f.endsWith('.mp3'))).toHaveLength(2);
    await voiceRecording(project, film('recording:take'), file, { kind: 'minimax', key: 'k', region: 'china' }, ffmpeg, cache, () => {}, minimax.io);
    expect(minimax.asked).toHaveLength(1);
  }, 60_000);

  it('writes nothing for a take that reads a line otherwise, and says what was heard', async () => {
    const file = await take(6);
    const heard = io(() => ({ segments: [...heardAt('潮汐是怎么来的', 0.5), ...heardAt('今天天气很好', 3)], base_resp: { status_code: 0 } }));
    const project = join(dir, 'project');
    await expect(voiceRecording(project, film('recording:take'), file, { kind: 'minimax', key: 'k' }, ffmpeg, join(dir, 'cache'), () => {}, heard.io)).rejects.toThrow(
      /does not read this line as written, so nothing was cut:\n- b: written "答案在月球。", heard "今天天气很好" \(0% as written\)/,
    );
    await expect(readdir(join(project, 'voice'))).rejects.toThrow();
  }, 60_000);

  it('asks for a film whose voice names a recording', async () => {
    await expect(voiceRecording(dir, film('minimax:x'), 'take.wav', { kind: 'minimax', key: 'k' }, ffmpeg, dir)).rejects.toThrow('voice="recording:take" instead of "minimax:x"');
  });
});
