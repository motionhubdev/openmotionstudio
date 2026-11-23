import { expect, it, vi } from 'vitest';
import { reviewBuild } from '../review';
import type { Stage } from '../capture';
const film = {
  width: 1920,
  height: 1080,
  fps: 30,
  seconds: 6,
  layers: [],
  sounds: [],
  captions: false,
  voice: null,
  narration: [],
  speech: {},
  scenes: [
    { id: 'intro', start: 0, duration: 3, layers: [], lines: [] },
    { id: 'end', start: 3, duration: 3, layers: [], lines: [] },
  ],
};
const stage = () => ({ film, png: vi.fn().mockResolvedValue(Buffer.from('')), inspect: vi.fn().mockResolvedValue({ outside: [], unloaded: [] }), close: vi.fn() }) as unknown as Stage;
it('samples each scene and closes the renderer', async () => {
  const s = stage();
  const result = await reviewBuild({ ok: true, version: 4, errors: [] }, async () => s);
  expect(result.checkedFrames).toBe(4);
  expect(result.issues).toEqual([]);
  expect(s.png).toHaveBeenCalledWith(1.5);
  expect(s.png).toHaveBeenCalledWith(4.5);
  expect(s.close).toHaveBeenCalledOnce();
});
it('reports the failing moment and always releases the renderer', async () => {
  const s = stage();
  vi.mocked(s.png).mockRejectedValue(new Error('Missing picture'));
  const result = await reviewBuild({ ok: true, version: 1, errors: [] }, async () => s);
  expect(result.issues).toMatchObject([{ kind: 'runtime', time: 0, text: 'Missing picture' }]);
  expect(s.close).toHaveBeenCalledOnce();
});
it('does not try to draw a failed bundle', async () => {
  const open = vi.fn();
  const r = await reviewBuild({ ok: false, version: 2, errors: ['Syntax error'] }, open);
  expect(open).not.toHaveBeenCalled();
  expect(r.issues[0]?.text).toBe('Syntax error');
});
it('distinguishes an export blocker from an intentional overflow warning', async () => {
  const s = stage();
  s.film = { ...film, width: 1919, scenes: [{ ...film.scenes[0]!, layers: [{ id: 'bleed', x: -10, y: 0, w: 100, h: 100, z: 0 }] }] };
  const r = await reviewBuild({ ok: true, version: 1, errors: [] }, async () => s);
  expect(r.issues.map((i) => i.severity)).toEqual(['error', 'warning']);
});

it('says once each text past the frame, and each face that never loaded, at the first frame it shows in', async () => {
  const s = stage();
  vi.mocked(s.inspect)
    .mockResolvedValueOnce({ outside: [], unloaded: [] })
    .mockResolvedValue({
      outside: [{ layer: 'figure', text: '约 6 倍', edges: ['left'] }, { layer: 'figure', text: '计算值', edges: ['bottom'] }],
      unloaded: [{ layer: 'title', family: 'Noto Sans SC', chars: '' }, { layer: 'note', family: 'sans-serif', chars: '天空' }],
    });
  const result = await reviewBuild({ ok: true, version: 1, errors: [] }, async () => s);
  const outside = result.issues.filter((issue) => issue.id.startsWith('outside-'));
  const faces = result.issues.filter((issue) => issue.id.startsWith('face-'));
  expect(outside).toHaveLength(1);
  expect(outside[0]).toMatchObject({ kind: 'layout', severity: 'warning', time: 1.5 });
  expect(outside[0]!.text).toContain('layer “figure” (“约 6 倍” and 1 more) runs past the frame\'s left and bottom edge');
  expect(faces.map((face) => face.text)).toEqual([
    "Layer “title” sets text in “Noto Sans SC”, which neither the film nor its motion loads, so in this machine's fallback: frames differ between machines. Declare a face that has them from the project's files, or use one the motion ships.",
    "Layer “note” draws “天空”, which the faces it loads lack, in this machine's own sans-serif face: frames differ between machines. Declare a face that has them from the project's files, or use one the motion ships.",
  ]);
});

it('says which layers and captions miss characters, each once, with every character any frame found', async () => {
  const s = stage();
  vi.mocked(s.inspect)
    .mockResolvedValueOnce({ outside: [], unloaded: [{ layer: 'cover-title', family: 'sans-serif', chars: '龘' }] })
    .mockResolvedValueOnce({ outside: [], unloaded: [{ layer: 'cover-title', family: 'sans-serif', chars: '鬱' }, { layer: null, family: 'sans-serif', chars: '爨' }] })
    .mockResolvedValue({ outside: [{ layer: null, text: '一句很长的字幕', edges: ['bottom'] }], unloaded: [{ layer: 'ending-title', family: 'sans-serif', chars: '鬱' }] });
  const result = await reviewBuild({ ok: true, version: 1, errors: [] }, async () => s);
  const faces = result.issues.filter((issue) => issue.id.startsWith('face-'));
  expect(faces.map((face) => face.id)).toEqual(['face-cover-title-sans-serif', 'face-captions-sans-serif', 'face-ending-title-sans-serif']);
  expect(faces[0]!.text).toContain('Layer “cover-title” draws “龘鬱”');
  expect(faces[1]!.text).toContain('The captions draw “爨”, which the faces they load lack');
  expect(result.issues.find((issue) => issue.id === 'outside-captions')!.text).toContain('Text in the captions (“一句很长的字幕”)');
});
