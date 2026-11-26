// `search_media` and `use_media` (the Studio's agent) and `oms media`: pictures, clips and sounds from the open web that
// a film may use commercially, found on Wikimedia Commons and Openverse (which indexes Freesound, Flickr and others), and
// taken into the project's media/ with their credit in media/credits.json. Only public domain, CC0, CC BY and CC BY-SA
// are offered: a licence that forbids commercial use or changes (NC, ND), or one this cannot read, is never shown.
// `use_media` asks the source again for the licence of what it takes, so a candidate's licence is the source's word, not
// the agent's. A clip is cut to the seconds the film needs and made H.264 without sound; a sound is cut and made AAC.

import { execFile } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type MediaKind = 'image' | 'video' | 'sound';

/** What a film may do with a found file, as its licence says it. */
export interface Licence {
  /** As a person reads it: "CC BY-SA 4.0", "CC0", "Public domain". */
  name: string;
  url?: string;
  /** The film must credit it. */
  attribution: boolean;
  /** A work made from it (a change to it) must carry the same licence. */
  shareAlike: boolean;
}

/** One found file, as search_media offers it. */
export interface MediaFind {
  /** What use_media takes: `commons:<file name>` or `openverse-<image|audio>:<id>`. */
  id: string;
  kind: MediaKind;
  title: string;
  author: string;
  licence: Licence;
  /** Where a person sees the file and its licence. */
  page: string;
  /** Wikimedia Commons, Freesound, Flickr…: where it is published. */
  source: string;
  width?: number;
  height?: number;
  seconds?: number;
  /** Its description or tags, cut short. */
  about: string;
  /** The file to fetch. */
  url: string;
}

/** A taken file's credit, as media/credits.json keeps it. */
export interface Credit {
  title: string;
  author: string;
  licence: string;
  licenceUrl?: string;
  source: string;
  page: string;
  /** What was done to it: cut to a part, made smaller, encoded again. */
  changes?: string;
}

type Get = (url: string) => Promise<Response>;

const AGENT = 'OpenMotionStudio (https://openmotion.studio)';
/** An answer from a source's API within 30 s; a file, which may be large and far away, within five minutes. */
const fetchOnce: Get = (url) => fetch(url, { headers: { 'User-Agent': AGENT, 'Api-User-Agent': AGENT }, signal: AbortSignal.timeout(/\/(api\.php|v1\/)/.test(url) ? 30_000 : 300_000) });
/** The most a search offers, and the largest file it fetches. */
const MOST = 10;
const LARGEST = 400 * 1024 * 1024;
/** The longest part of a clip or sound taken, in seconds: every place a film plays holds each clip whole in memory. */
const LONGEST = { video: 30, sound: 300 };

/** Text without its HTML, its entities and its runs of blanks. */
export const plain = (html: string | undefined): string =>
  (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

/**
 * The licence named `name` (as Commons' LicenseShortName or Openverse's `license` gives it, with Openverse's version
 * apart), when it lets a film use the file commercially and change it; otherwise undefined.
 */
export function licenceOf(name: string, version?: string): Licence | undefined {
  const s = name.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (!s || /(^|-)n[cd](-|$)/.test(s)) return undefined;
  if (/^(pd|pdm|public-domain|cc-pdm|cc-pd)(-|$)/.test(s) || s === 'public-domain-mark') return { name: 'Public domain', attribution: false, shareAlike: false };
  if (/^(cc0|cc-zero|cc-0)(-|$)/.test(s)) return { name: 'CC0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', attribution: false, shareAlike: false };
  // CC BY or BY-SA, its version and, after it, a country's port (CC BY 2.0 de).
  const cc = /^(?:cc-)?(by|by-sa)(?:-(\d(?:\.\d)?)(?:-[a-z]{2,})?)?$/.exec(s);
  if (!cc) return undefined;
  const kind = cc[1]!;
  const v = version ?? cc[2] ?? '4.0';
  const ver = /^\d$/.test(v) ? `${v}.0` : v;
  const shareAlike = kind === 'by-sa';
  return { name: `CC ${shareAlike ? 'BY-SA' : 'BY'} ${ver}`, url: `https://creativecommons.org/licenses/${kind}/${ver}/`, attribution: true, shareAlike };
}

const COMMONS = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2';
const INFO = 'prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=LicenseShortName|Artist|ImageDescription|Credit&iiurlwidth=1920';
const FILETYPE: Record<MediaKind, string> = { image: 'bitmap', video: 'video', sound: 'audio' };

type CommonsPage = {
  title: string;
  imageinfo?: { url: string; thumburl?: string; descriptionurl: string; width: number; height: number; duration?: number; mime: string; extmetadata?: Record<string, { value?: string }> }[];
};

function commonsFind(page: CommonsPage, kind: MediaKind): MediaFind | undefined {
  const info = page.imageinfo?.[0];
  if (!info) return undefined;
  const meta = info.extmetadata ?? {};
  const licence = licenceOf(plain(meta.LicenseShortName?.value));
  if (!licence) return undefined;
  const name = page.title.replace(/^File:/, '');
  return {
    id: `commons:${name}`,
    kind,
    title: name.replace(/\.[a-z0-9]+$/i, ''),
    author: plain(meta.Artist?.value).slice(0, 120) || 'unknown',
    licence,
    page: info.descriptionurl,
    source: 'Wikimedia Commons',
    ...(kind === 'sound' ? {} : { width: info.width, height: info.height }),
    ...(info.duration ? { seconds: Math.round(info.duration * 10) / 10 } : {}),
    about: plain(meta.ImageDescription?.value).slice(0, 200),
    // A picture at most 1,920 wide (the width Commons scales to); a clip or sound whole.
    url: kind === 'image' && info.thumburl ? info.thumburl : info.url,
  };
}

async function commons(kind: MediaKind, words: string, get: Get): Promise<MediaFind[]> {
  const search = `generator=search&gsrnamespace=6&gsrlimit=${MOST * 3}&gsrsearch=${encodeURIComponent(`${words} filetype:${FILETYPE[kind]}`)}`;
  const response = await get(`${COMMONS}&${search}&${INFO}`);
  if (!response.ok) throw new Error(`Wikimedia Commons answered ${response.status}.`);
  const pages = ((await response.json()) as { query?: { pages?: (CommonsPage & { index?: number })[] } }).query?.pages ?? [];
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .flatMap((page) => commonsFind(page, kind) ?? []);
}

type OpenverseResult = {
  id: string;
  title?: string;
  creator?: string;
  license: string;
  license_version?: string;
  foreign_landing_url: string;
  url: string;
  source?: string;
  provider?: string;
  width?: number;
  height?: number;
  duration?: number;
  tags?: { name: string }[];
};

const SOURCES: Record<string, string> = { freesound: 'Freesound', flickr: 'Flickr', wikimedia: 'Wikimedia Commons', wikimedia_audio: 'Wikimedia Commons', jamendo: 'Jamendo', ccmixter: 'ccMixter' };

function openverseFind(r: OpenverseResult, kind: 'image' | 'sound'): MediaFind | undefined {
  const licence = licenceOf(r.license, r.license_version);
  if (!licence || !r.url) return undefined;
  const from = r.source ?? r.provider ?? '';
  return {
    id: `openverse-${kind === 'image' ? 'image' : 'audio'}:${r.id}`,
    kind,
    title: r.title || 'untitled',
    author: (r.creator || 'unknown').slice(0, 120),
    licence,
    page: r.foreign_landing_url,
    source: SOURCES[from] ?? from ?? 'Openverse',
    ...(r.width ? { width: r.width, height: r.height } : {}),
    ...(r.duration ? { seconds: Math.round(r.duration / 100) / 10 } : {}),
    about: (r.tags ?? []).slice(0, 10).map((t) => t.name).join(', '),
    url: r.url,
  };
}

async function openverse(kind: 'image' | 'sound', words: string, get: Get): Promise<MediaFind[]> {
  const path = kind === 'image' ? 'images' : 'audio';
  const response = await get(`https://api.openverse.org/v1/${path}/?q=${encodeURIComponent(words)}&license=by,by-sa,cc0,pdm&page_size=${MOST}&mature=false`);
  if (!response.ok || !(response.headers.get('content-type') ?? '').includes('json')) throw new Error(`Openverse answered ${response.status}.`);
  return (((await response.json()) as { results?: OpenverseResult[] }).results ?? []).flatMap((r) => openverseFind(r, kind) ?? []);
}

/**
 * Up to ten files of `kind` for `words` that a film may use commercially: pictures from Wikimedia Commons, then
 * Openverse; clips from Commons; sounds from Openverse (Freesound's among them), then Commons. A source that fails is
 * passed over while another answers; when none does, its error is the result.
 */
export async function searchMedia(kind: MediaKind, words: string, get: Get = fetchOnce): Promise<MediaFind[]> {
  if (!['image', 'video', 'sound'].includes(kind)) throw new Error('kind is image, video or sound.');
  if (!words.trim()) throw new Error('Name what to look for, in English, as "runners headlamps night mountain".');
  const q = words.trim();
  const fromCommons = () => commons(kind, q, get);
  const sources = kind === 'image' ? [fromCommons, () => openverse('image', q, get)] : kind === 'video' ? [fromCommons] : [() => openverse('sound', q, get), fromCommons];
  const found: MediaFind[] = [];
  const errors: string[] = [];
  for (const source of sources) {
    try {
      found.push(...(await source()));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (!found.length && errors.length) throw new Error(errors.join(' '));
  const seen = new Set<string>();
  return found.filter((f) => !seen.has(f.page) && seen.add(f.page)).slice(0, MOST);
}

/** The file `id` names, as its source describes it now (its licence included), or an error saying why not. */
export async function mediaById(id: string, get: Get = fetchOnce): Promise<MediaFind> {
  const commonsName = /^commons:(.+)$/.exec(id)?.[1];
  if (commonsName) {
    const response = await get(`${COMMONS}&titles=${encodeURIComponent(`File:${commonsName}`)}&${INFO}`);
    if (!response.ok) throw new Error(`Wikimedia Commons answered ${response.status}.`);
    const page = ((await response.json()) as { query?: { pages?: CommonsPage[] } }).query?.pages?.[0];
    const mime = page?.imageinfo?.[0]?.mime ?? '';
    const kind: MediaKind = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') || /\.(webm|ogv)$/i.test(commonsName) ? 'video' : 'sound';
    const found = page && commonsFind(page, kind);
    if (!page?.imageinfo) throw new Error(`Wikimedia Commons has no file named ${commonsName}.`);
    if (!found) throw new Error(`${commonsName} is not under a licence a film may use commercially and change (public domain, CC0, CC BY or CC BY-SA).`);
    return found;
  }
  const open = /^openverse-(image|audio):([0-9a-f-]{36})$/.exec(id);
  if (open) {
    const response = await get(`https://api.openverse.org/v1/${open[1] === 'image' ? 'images' : 'audio'}/${open[2]}/`);
    if (!response.ok) throw new Error(`Openverse answered ${response.status} for ${id}.`);
    const found = openverseFind((await response.json()) as OpenverseResult, open[1] === 'image' ? 'image' : 'sound');
    if (!found) throw new Error(`${id} is not under a licence a film may use commercially and change.`);
    return found;
  }
  throw new Error(`${id} is not an id search_media gave: those are commons:<file name> or openverse-image:<id> / openverse-audio:<id>.`);
}

/** A picture's file type, from its first bytes. */
export function pictureType(bytes: Buffer): 'jpg' | 'png' | 'webp' | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return undefined;
}

const run = (ffmpeg: string, args: string[]) =>
  new Promise<void>((done, fail) =>
    execFile(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { maxBuffer: 16 * 1024 * 1024 }, (error, _out, err) =>
      error ? fail(new Error(`ffmpeg could not make the file: ${(err || error.message).trim().split('\n').slice(-3).join(' ')}`)) : done(),
    ),
  );

/** The credits file of the project in `dir`: each taken file's credit, by its path in the project. */
export const CREDITS = 'media/credits.json';

export async function readCredits(dir: string): Promise<Record<string, Credit>> {
  try {
    return JSON.parse(await readFile(join(dir, CREDITS), 'utf8')) as Record<string, Credit>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw new Error(`${CREDITS} is not valid JSON: mend it before taking more media.`);
  }
}

/** One line crediting a file, as a film's credits or a page shows it. */
export const creditLine = (c: Credit): string => `“${c.title}” by ${c.author}, ${c.licence}${c.changes ? ` (${c.changes})` : ''}, via ${c.source}`;

/**
 * Takes the file `id` names (from searchMedia) into the project in `dir` as media/<name>.<type>, with its credit in
 * media/credits.json, replacing neither another file nor a credit. A picture is kept as it comes (at most 1,920 wide);
 * a clip is cut to `from` + `seconds` (at most 30) and made H.264 MP4 at most 1,920 wide, without sound; a sound is cut
 * the same way (at most 300 s; whole when `seconds` is left out) and made AAC (.m4a). Returns the file and its credit.
 */
export async function takeMedia(
  dir: string,
  id: string,
  name: string,
  cut: { from?: number; seconds?: number },
  ffmpeg: string | (() => Promise<string>),
  get: Get = fetchOnce,
): Promise<{ file: string; credit: Credit; find: MediaFind }> {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(name)) throw new Error(`name is the file's name in media/, lower case with digits and hyphens, as alps-wind (got ${name}).`);
  const from = cut.from ?? 0;
  if (!(from >= 0) || (cut.seconds !== undefined && !(cut.seconds > 0))) throw new Error('from and seconds are seconds from the start of the file, seconds above 0.');
  const find = await mediaById(id, get);
  const credits = await readCredits(dir);
  const media = join(dir, 'media');
  await mkdir(media, { recursive: true });
  if ((await lstat(media)).isSymbolicLink()) throw new Error('media/ is a symbolic link: the Studio writes only inside the project.');
  const response = await get(find.url);
  if (!response.ok) throw new Error(`${find.source} answered ${response.status} for the file.`);
  if (Number(response.headers.get('content-length') ?? 0) > LARGEST) throw new Error(`The file is over ${LARGEST / 1024 / 1024} MB: pick a smaller one.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  let file: string;
  const changes: string[] = [];
  if (find.kind === 'image') {
    const type = pictureType(bytes);
    if (!type) throw new Error('What came back is not a JPEG, PNG or WebP picture: nothing was saved. Try again in a minute, or another file.');
    file = `media/${name}.${type}`;
    if (find.width && find.width > 1920) changes.push('made smaller');
    await writeFile(join(dir, file), bytes, { flag: 'wx' }).catch(taken(file));
  } else {
    const longest = LONGEST[find.kind];
    const seconds = cut.seconds ?? (find.seconds !== undefined ? find.seconds - from : undefined);
    if (seconds === undefined || seconds > longest)
      throw new Error(`Take at most ${longest} s of a ${find.kind === 'video' ? 'clip' : 'sound'}${find.seconds ? ` (this one lasts ${find.seconds} s)` : ''}: give from and seconds.`);
    file = `media/${name}.${find.kind === 'video' ? 'mp4' : 'm4a'}`;
    const scratch = await mkdtemp(join(tmpdir(), 'oms-media-'));
    try {
      const source = join(scratch, 'source');
      const out = join(scratch, find.kind === 'video' ? 'out.mp4' : 'out.m4a');
      await writeFile(source, bytes);
      const range = ['-ss', String(from), '-t', String(seconds)];
      const exe = typeof ffmpeg === 'string' ? ffmpeg : await ffmpeg();
      if (find.kind === 'video')
        await run(exe, [...range, '-i', source, '-an', '-vf', "scale='min(1920,iw)':-2,format=yuv420p", '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out]);
      else await run(exe, [...range, '-i', source, '-vn', '-c:a', 'aac', '-b:a', '192k', out]);
      changes.push(from || cut.seconds !== undefined ? `${from}–${Math.round((from + seconds) * 10) / 10} s` : 'whole', 'encoded again');
      await writeFile(join(dir, file), await readFile(out), { flag: 'wx' }).catch(taken(file));
    } finally {
      await rm(scratch, { recursive: true, force: true, maxRetries: 4 });
    }
  }
  const credit: Credit = {
    title: find.title,
    author: find.author,
    licence: find.licence.name,
    ...(find.licence.url ? { licenceUrl: find.licence.url } : {}),
    source: find.source,
    page: find.page,
    ...(changes.length ? { changes: changes.join(', ') } : {}),
  };
  await writeFile(join(dir, CREDITS), `${JSON.stringify({ ...credits, [file]: credit }, null, 2)}\n`);
  return { file, credit, find };
}

const taken = (file: string) => (error: NodeJS.ErrnoException) => {
  throw error.code === 'EEXIST' ? new Error(`${file} is there already: give another name.`) : error;
};

/** A found file as one line and its details, for the agent to choose from. */
export function describeFind(f: MediaFind, n: number): string {
  const size = f.width ? ` ${f.width}×${f.height}` : '';
  const length = f.seconds ? ` ${f.seconds} s` : '';
  const terms = f.licence.shareAlike ? ' (credit it; share-alike: show it whole, unaltered)' : f.licence.attribution ? ' (credit it)' : '';
  return `${n}. ${f.id}\n   ${f.title}${size}${length} · ${f.licence.name}${terms} · by ${f.author} · ${f.source}${f.about ? `\n   ${f.about}` : ''}`;
}

/** What use_media and oms media use say about a taken file: how to draw or play it, and how to credit it. */
export function takenReport(taken: { file: string; credit: Credit; find: MediaFind }): string[] {
  const { file, credit, find } = taken;
  const name = file.replace(/^media\//, '').replace(/\.[a-z0-9]+$/, '').replace(/-/g, '_').replace(/^(\d)/, '_$1');
  const use =
    find.kind === 'image'
      ? [`import ${name} from './${file}';`, `<img src={${name}} … />`]
      : find.kind === 'video'
        ? [`import ${name} from './${file}';`, `<Video src={${name}} />`]
        : [`<Sound src="${file}" … />`];
  return [
    `Took ${file} (${credit.licence}${credit.changes ? `; ${credit.changes}` : ''}), its credit kept in ${CREDITS}.`,
    ...use,
    find.licence.attribution
      ? `Credit it where the film is seen, in its closing credits: ${creditLine(credit)}.${find.licence.shareAlike ? ' It is share-alike: show it whole (scaled, moved or framed, never cropped, recoloured or drawn over), so the film is not a changed copy of it.' : ''}`
      : 'It needs no credit; a closing credit is still kind.',
  ];
}
