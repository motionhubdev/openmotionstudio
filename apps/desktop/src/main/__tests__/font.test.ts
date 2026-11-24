import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bundledSources, faces, names, projectCharacters, slug, takeFont } from '../font';
import { font as filmFont } from '../../../../cli/worker';

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-font-'));
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

/** A font file with only a name table: each record a Windows US English string. */
function font(records: Record<number, string>): Buffer {
  const strings = Object.entries(records).map(([id, text]) => ({ id: Number(id), bytes: Buffer.from(text, 'utf16le').swap16() }));
  const table = Buffer.alloc(6 + strings.length * 12);
  table.writeUInt16BE(strings.length, 2);
  table.writeUInt16BE(table.length, 4);
  let offset = 0;
  strings.forEach(({ id, bytes }, i) => {
    const at = 6 + i * 12;
    table.writeUInt16BE(3, at);
    table.writeUInt16BE(1, at + 2);
    table.writeUInt16BE(0x409, at + 4);
    table.writeUInt16BE(id, at + 6);
    table.writeUInt16BE(bytes.length, at + 8);
    table.writeUInt16BE(offset, at + 10);
    offset += bytes.length;
  });
  const header = Buffer.alloc(12 + 16);
  header.writeUInt16BE(1, 4);
  header.write('name', 12, 'latin1');
  header.writeUInt32BE(28, 20);
  return Buffer.concat([header, table, ...strings.map((s) => s.bytes)]);
}

const CSS = `@font-face { font-family: 'Noto Sans SC'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/l/font?kit=a) format('truetype'); }
@font-face { font-family: 'Noto Sans SC'; font-style: normal; font-weight: 700; src: url(https://fonts.gstatic.com/l/font?kit=b) format('truetype'); }`;

describe('oms font', () => {
  it("reads a font's name table, the faces of a stylesheet, and a family's file name", () => {
    expect(names(font({ 0: '© Adobe', 14: 'https://scripts.sil.org/OFL' }))).toEqual(new Map([[0, '© Adobe'], [14, 'https://scripts.sil.org/OFL']]));
    expect(faces(CSS + "@font-face { font-weight: 400; src: url(https://evil.example/x.ttf); }")).toEqual([
      { weight: 400, style: 'normal', url: 'https://fonts.gstatic.com/l/font?kit=a' },
      { weight: 700, style: 'normal', url: 'https://fonts.gstatic.com/l/font?kit=b' },
    ]);
    expect(slug(' Noto Sans SC ')).toBe('noto-sans-sc');
  });

  it("takes every character the project's sources write, not its media or packages", async () => {
    await mkdir(join(dir, 'parts'));
    await mkdir(join(dir, 'node_modules'));
    await mkdir(join(dir, 'media'));
    await writeFile(join(dir, 'film.tsx'), '<Line>四季</Line>');
    await writeFile(join(dir, 'parts', 'kit.tsx'), "const t = '直射';");
    await writeFile(join(dir, 'node_modules', 'x.js'), '龘');
    await writeFile(join(dir, 'media', 'notes.md'), '鑫');
    const chars = await projectCharacters(dir);
    for (const c of '四季直射A ~') expect(chars).toContain(c);
    expect(chars).not.toMatch(/[龘鑫]/);
  });

  it("takes the words a film imports from outside its folder, from its bundle's sources, but not its packages", async () => {
    const map = { sources: ['../shared/copy.json', 'film.tsx', '../node_modules/react/index.js'], sourcesContent: ['{"hook": "网关"}', '<Line>四季</Line>', '龘'] };
    const bundle = `(() => {})();\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString('base64')}\n`;
    const sources = bundledSources(bundle);
    expect(sources).toEqual(['{"hook": "网关"}', '<Line>四季</Line>']);
    expect(bundledSources('(() => {})();')).toEqual([]);
    const chars = await projectCharacters(dir, sources);
    for (const c of '网关四季') expect(chars).toContain(c);
    expect(chars).not.toContain('龘');
  });

  it('writes each weight and the licence, the OFL after the font\'s copyright, and asks for exactly those characters', async () => {
    await writeFile(join(dir, 'film.tsx'), '<Line>四季</Line>');
    await mkdir(join(dir, 'media', 'fonts'), { recursive: true });
    await writeFile(join(dir, 'media', 'fonts', 'mine.woff2'), 'keep');
    const asked: string[] = [];
    const get = async (url: string) => {
      asked.push(url);
      return url.startsWith('https://fonts.googleapis.com/') ? new Response(CSS) : new Response(new Uint8Array(font({ 0: '© Adobe', 14: 'https://scripts.sil.org/OFL' })));
    };
    const result = await takeFont(dir, 'Noto Sans SC', [700, 400], 'OFL TEXT', [], get);
    expect(result.files).toEqual(['media/fonts/noto-sans-sc-400.ttf', 'media/fonts/noto-sans-sc-700.ttf', 'media/fonts/noto-sans-sc-LICENSE.txt']);
    expect(result.licence).toBe('SIL Open Font License 1.1');
    expect((await readdir(join(dir, 'media', 'fonts'))).sort()).toEqual(['mine.woff2', 'noto-sans-sc-400.ttf', 'noto-sans-sc-700.ttf', 'noto-sans-sc-LICENSE.txt']);
    expect(await readFile(join(dir, 'media', 'fonts', 'noto-sans-sc-LICENSE.txt'), 'utf8')).toBe('© Adobe\n\nOFL TEXT');
    const query = new URL(asked[0]!).searchParams;
    expect(query.get('family')).toBe('Noto Sans SC:wght@400;700');
    expect(query.get('text')).toContain('四季');
  });

  it('says how many of too many characters are only in files the film imports', async () => {
    await writeFile(join(dir, 'film.tsx'), '<Line>四季</Line>');
    const shared = String.fromCodePoint(...Array.from({ length: 3200 }, (_, i) => 0x4e00 + i));
    await expect(takeFont(dir, 'Noto Sans SC', [400], '', [shared], async () => new Response(CSS))).rejects.toThrow(
      /The film writes \d+ different characters, 3199 of them only in files it imports from outside its folder/,
    );
  });

  it('cuts a film that does not build from its own sources, and says why the rest was left out', async () => {
    // The film imports the very face being fetched again: it cannot build until it is there.
    await writeFile(join(dir, 'film.tsx'), "import face from './media/fonts/noto-sans-sc-400.ttf';\nexport default () => <div>{face}四季</div>;\n");
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      asked.push(url);
      return url.startsWith('https://fonts.googleapis.com/') ? new Response(CSS) : new Response(new Uint8Array(font({ 0: '© Adobe' })));
    });
    const scratch = await mkdtemp(join(tmpdir(), 'oms-font-build-'));
    try {
      const result = await filmFont(dir, scratch, 'Noto Sans SC', [400], 'OFL TEXT');
      expect(result.files).toContain('media/fonts/noto-sans-sc-400.ttf');
      expect(result.unbuilt).toMatch(/noto-sans-sc-400\.ttf/);
      expect(decodeURIComponent(asked[0]!)).toContain('四季');
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('says what is wrong: no such family, a weight it lacks, a licence it does not name', async () => {
    await writeFile(join(dir, 'film.tsx'), 'x');
    await expect(takeFont(dir, 'No Such', [400], '', [], async () => new Response('', { status: 400 }))).rejects.toThrow('Google Fonts has no family "No Such"');
    await expect(takeFont(dir, 'Noto Sans SC', [400, 900], '', [], async () => new Response(CSS))).rejects.toThrow('not in weight 900');
    await expect(takeFont(dir, 'Noto Sans SC', [450.5], '', [], async () => new Response(CSS))).rejects.toThrow('weights from 1 to 1000');
    const get = async (url: string) => (url.startsWith('https://fonts.googleapis.com/') ? new Response(CSS) : new Response(new Uint8Array(font({ 0: '© Someone' }))));
    expect((await takeFont(dir, 'Noto Sans SC', [400], 'OFL TEXT', [], get)).licence).toBe('see its licence file');
    expect(await readFile(join(dir, 'media', 'fonts', 'noto-sans-sc-LICENSE.txt'), 'utf8')).toMatch(/^© Someone\n\nThe font names no licence/);
  });
});
