// `oms font`: a face from Google Fonts, cut to the characters the film writes, into its media/fonts/ with its licence.
// What it writes is the project's sources and every source its bundle was built from, so words a film imports from
// outside its folder (a shared copy file) are cut in too.
// Google Fonts subsets a family to the characters a request names (`text=`), so a Chinese face of tens of megabytes
// comes as a few tens of kilobytes; run it again when the film's words change. The licence comes from the font's own
// name table: its copyright, and the SIL Open Font License beside it when that is the font's licence.

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/** Where a project's text is: its sources, not its media, packages or the Studio's state. */
const TEXT = /\.(tsx|ts|jsx|js|json|md)$/i;
const SKIPPED = new Set(['node_modules', '.git', '.motion-studio', 'media']);
/** More characters than this make a request Google Fonts refuses: the film is a book, not a film. */
const MOST = 3000;

/**
 * Every character the project's sources and `sources` (the film's bundled sources) write, with the printable ASCII range
 * always, in code point order.
 */
export async function projectCharacters(dir: string, sources: string[] = []): Promise<string> {
  const chars = new Set<string>();
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const source of sources) for (const char of source) if (char.codePointAt(0)! >= 0x20) chars.add(char);
  const walk = async (at: string) => {
    for (const entry of await readdir(at, { withFileTypes: true }).catch(() => [])) {
      if (SKIPPED.has(entry.name)) continue;
      const path = join(at, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (TEXT.test(entry.name)) for (const char of await readFile(path, 'utf8')) if (char.codePointAt(0)! >= 0x20) chars.add(char);
    }
  };
  await walk(dir);
  return [...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');
}

/** The faces a Google Fonts stylesheet offers: each weight and style with its file's address. */
export function faces(css: string): { weight: number; style: string; url: string }[] {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => ({
    weight: Number(/font-weight:\s*(\d+)/.exec(body!)?.[1] ?? 400),
    style: /font-style:\s*(\w+)/.exec(body!)?.[1] ?? 'normal',
    url: /src:\s*url\(([^)]+)\)/.exec(body!)?.[1] ?? '',
  })).filter((face) => face.url.startsWith('https://fonts.gstatic.com/'));
}

/** Records of a TrueType or OpenType file's name table, by name id (English where there is a choice). */
export function names(font: Buffer): Map<number, string> {
  const found = new Map<number, string>();
  const tables = font.readUInt16BE(4);
  for (let i = 0; i < tables; i++) {
    const at = 12 + i * 16;
    if (font.toString('latin1', at, at + 4) !== 'name') continue;
    const table = font.readUInt32BE(at + 8);
    const count = font.readUInt16BE(table + 2);
    const strings = table + font.readUInt16BE(table + 4);
    for (let r = 0; r < count; r++) {
      const record = table + 6 + r * 12;
      const [platform, , language, id, length, offset] = [0, 2, 4, 6, 8, 10].map((o) => font.readUInt16BE(record + o)) as [number, number, number, number, number, number];
      const bytes = font.subarray(strings + offset, strings + offset + length);
      // Windows (UTF-16BE, US English first) or Macintosh Roman.
      const text = platform === 3 ? Buffer.from(bytes).swap16().toString('utf16le') : platform === 1 ? bytes.toString('latin1') : '';
      if (text && (!found.has(id) || (platform === 3 && language === 0x409))) found.set(id, text);
    }
  }
  return found;
}

/**
 * The text of each source a built film was made from, from the inline source map esbuild writes at its end: the film's
 * own files and what it imports from outside the project, not packages.
 */
export function bundledSources(bundle: string): string[] {
  const map = /\/\/# sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)\s*$/.exec(bundle);
  if (!map) return [];
  const { sources = [], sourcesContent = [] } = JSON.parse(Buffer.from(map[1]!, 'base64').toString('utf8')) as { sources?: string[]; sourcesContent?: (string | null)[] };
  return sources.flatMap((source, i) => (/(^|\/)node_modules\//.test(source) || !sourcesContent[i] ? [] : [sourcesContent[i]!]));
}

/** A family's file name: `Noto Sans SC` is `noto-sans-sc`. */
export const slug = (family: string): string => family.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Takes `family` from Google Fonts in `weights`, cut to the characters the project in `dir` and `sources` (the film's
 * bundled sources, bundledSources) write, into
 * media/fonts/<slug>-<weight>.ttf with media/fonts/<slug>-LICENSE.txt, replacing those files and no others. `ofl` is the
 * licence's text, written after the font's copyright when the font says it is under it. Returns what it wrote.
 */
export async function takeFont(
  dir: string,
  family: string,
  weights: number[],
  ofl: string,
  sources: string[] = [],
  get: (url: string) => Promise<Response> = (url) => fetch(url, { signal: AbortSignal.timeout(60_000) }),
): Promise<{ files: string[]; characters: number; licence: string }> {
  if (!family.trim() || !weights.length || weights.some((w) => !Number.isInteger(w) || w < 1 || w > 1000)) throw new Error('Name a family and weights from 1 to 1000, as --family "Noto Sans SC" --weights 400,700.');
  const text = await projectCharacters(dir, sources);
  if ([...text].length > MOST) throw new Error(`The project writes ${[...text].length} different characters, more than ${MOST}: oms font cuts a face for a film's words, not a whole script.`);
  const query = `family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}:wght@${[...new Set(weights)].sort((a, b) => a - b).join(';')}&text=${encodeURIComponent(text)}`;
  const response = await get(`https://fonts.googleapis.com/css2?${query}`);
  if (!response.ok)
    throw new Error(response.status === 400 ? `Google Fonts has no family "${family}" in weights ${weights.join(', ')}: see fonts.google.com for its name and weights.` : `Google Fonts answered ${response.status} for "${family}".`);
  const found = faces(await response.text()).filter((face) => face.style === 'normal');
  const missing = weights.filter((w) => !found.some((face) => face.weight === w));
  if (missing.length) throw new Error(`Google Fonts has "${family}" but not in weight ${missing.join(', ')}.`);
  const fonts = join(dir, 'media', 'fonts');
  await mkdir(fonts, { recursive: true });
  const files: string[] = [];
  let licence = '';
  let open = false;
  for (const face of found) {
    const file = await get(face.url);
    if (!file.ok) throw new Error(`Google Fonts answered ${file.status} for ${family} ${face.weight}.`);
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!licence) {
      const record = names(bytes);
      const copyright = record.get(0) ?? `${family}: no copyright in the font.`;
      const terms = `${record.get(13) ?? ''}\n${record.get(14) ?? ''}`.trim();
      // The licence's description (name 13) or its address (name 14): some faces carry only the address.
      open = /open font license|scripts\.sil\.org\/ofl|openfontlicense\.org/i.test(terms);
      licence = open ? `${copyright}\n\n${ofl}` : `${copyright}\n\n${terms || 'The font names no licence: check its terms on fonts.google.com before publishing a film with it.'}\n`;
    }
    const name = `${slug(family)}-${face.weight}.ttf`;
    await writeFile(join(fonts, name), bytes);
    files.push(`media/fonts/${name}`);
  }
  await writeFile(join(fonts, `${slug(family)}-LICENSE.txt`), licence);
  files.push(`media/fonts/${slug(family)}-LICENSE.txt`);
  return { files, characters: [...text].length, licence: open ? 'SIL Open Font License 1.1' : 'see its licence file' };
}
