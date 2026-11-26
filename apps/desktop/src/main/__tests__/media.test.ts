import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { licenceOf, mediaById, searchMedia, takeMedia, takenReport } from '../media';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

/** A Commons page for `name` under `licence`, as the API gives it. */
const page = (name: string, licence: string, index = 1) => ({
  title: `File:${name}`,
  index,
  imageinfo: [
    {
      url: `https://upload.wikimedia.org/${name}`,
      thumburl: `https://upload.wikimedia.org/thumb/${name}`,
      descriptionurl: `https://commons.wikimedia.org/wiki/File:${name}`,
      width: 3456,
      height: 2592,
      mime: 'image/jpeg',
      extmetadata: { LicenseShortName: { value: licence }, Artist: { value: '<a href="x">Anthospace</a>' }, ImageDescription: { value: 'Runners &amp; poles' } },
    },
  ],
});

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

describe('licenceOf', () => {
  it('offers only licences a film may use commercially and change', () => {
    expect(licenceOf('CC BY-SA 4.0')).toEqual({ name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', attribution: true, shareAlike: true });
    expect(licenceOf('by', '3.0')).toMatchObject({ name: 'CC BY 3.0', attribution: true, shareAlike: false });
    expect(licenceOf('CC BY 2.0 de')).toMatchObject({ name: 'CC BY 2.0' });
    expect(licenceOf('cc0')).toMatchObject({ name: 'CC0', attribution: false });
    expect(licenceOf('Public domain')).toMatchObject({ name: 'Public domain', attribution: false });
    expect(licenceOf('pdm')).toMatchObject({ name: 'Public domain' });
    for (const refused of ['CC BY-NC 4.0', 'CC BY-NC-SA 2.0', 'by-nd', 'GFDL', 'Attribution', 'Copyrighted free use', ''])
      expect(licenceOf(refused), refused).toBeUndefined();
  });
});

describe('searchMedia', () => {
  it('drops what a film may not use, and keeps going when one source fails', async () => {
    const get = async (url: string) =>
      url.includes('openverse')
        ? new Response('busy', { status: 503 })
        : json({ query: { pages: [page('b.jpg', 'CC BY-NC 2.0', 1), page('a.jpg', 'CC BY-SA 4.0', 0)] } });
    const found = await searchMedia('image', 'utmb runners', get);
    expect(found.map((f) => [f.id, f.licence.name, f.author, f.about, f.url])).toEqual([
      ['commons:a.jpg', 'CC BY-SA 4.0', 'Anthospace', 'Runners & poles', 'https://upload.wikimedia.org/thumb/a.jpg'],
    ]);
  });

  it('says why when no source answers', async () => {
    await expect(searchMedia('video', 'x', async () => new Response('', { status: 500 }))).rejects.toThrow('Wikimedia Commons answered 500.');
  });
});

describe('takeMedia', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'oms-media-test-'));
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  const commons = (licence: string) => async (url: string) => (url.includes('api.php') ? json({ query: { pages: [page('a.jpg', licence)] } }) : new Response(JPEG));

  it('writes the picture and its credit, as the source gives its licence', async () => {
    const taken = await takeMedia(dir, 'commons:a.jpg', 'col-ferret', {}, 'ffmpeg-unused', commons('CC BY-SA 4.0'));
    expect(taken.file).toBe('media/col-ferret.jpg');
    expect(await readFile(join(dir, 'media/col-ferret.jpg'))).toEqual(JPEG);
    expect(JSON.parse(await readFile(join(dir, 'media/credits.json'), 'utf8'))).toEqual({
      'media/col-ferret.jpg': {
        title: 'a',
        author: 'Anthospace',
        licence: 'CC BY-SA 4.0',
        licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        source: 'Wikimedia Commons',
        page: 'https://commons.wikimedia.org/wiki/File:a.jpg',
        changes: 'made smaller',
      },
    });
    expect(takenReport(taken).join('\n')).toContain('never cropped');
  });

  it('refuses a file whose licence the source now says is not for commercial use', async () => {
    await expect(takeMedia(dir, 'commons:a.jpg', 'a', {}, 'ffmpeg', commons('CC BY-NC 4.0'))).rejects.toThrow('not under a licence');
  });

  it('replaces only a file it took before, and never takes a name outside media/', async () => {
    await takeMedia(dir, 'commons:a.jpg', 'a', {}, 'ffmpeg', commons('CC0'));
    await expect(takeMedia(dir, 'commons:a.jpg', 'a', {}, 'ffmpeg', commons('CC0'))).resolves.toMatchObject({ file: 'media/a.jpg' });
    await writeFile(join(dir, 'media/own.jpg'), 'the person’s');
    await expect(takeMedia(dir, 'commons:a.jpg', 'own', {}, 'ffmpeg', commons('CC0'))).rejects.toThrow('is there already');
    expect(await readFile(join(dir, 'media/own.jpg'), 'utf8')).toBe('the person’s');
    await expect(takeMedia(dir, 'commons:a.jpg', '../a', {}, 'ffmpeg', commons('CC0'))).rejects.toThrow('lower case');
  });

  it('keeps the credits a person wrote', async () => {
    await takeMedia(dir, 'commons:a.jpg', 'one', {}, 'ffmpeg', commons('CC0'));
    await takeMedia(dir, 'commons:a.jpg', 'two', {}, 'ffmpeg', commons('CC0'));
    expect(Object.keys(JSON.parse(await readFile(join(dir, 'media/credits.json'), 'utf8')))).toEqual(['media/one.jpg', 'media/two.jpg']);
  });
});

describe('mediaById', () => {
  it('takes only ids search_media gives', async () => {
    await expect(mediaById('https://example.com/a.jpg', async () => json({}))).rejects.toThrow('not an id search_media gave');
  });
});
