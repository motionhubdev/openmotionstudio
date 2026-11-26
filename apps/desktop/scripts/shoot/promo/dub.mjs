#!/usr/bin/env node
// The take's film in other languages, for the voice chapter's end (make.mjs takes them from RUN_DIR/dubs or PROMO_DUBS).
//
//   node dub.mjs prepare PROJECT DUBS LINES.json   copies the take's project once a language into DUBS/<lang>, its
//                                                  lines translated and its voice that language's
//   oms voice DUBS/<lang>                          speaks them (MINIMAX_API_KEY in the environment; each line is paid)
//   node dub.mjs render DUBS                       renders each to DUBS/<lang>.mp4
//
// LINES.json: {"voices": {"zh": "minimax:…", …}, "lines": {"<line id>": {"zh": "…", …}, …}}, one entry for each <Line> of
// the film, written by a person: the words are the film's, in that language.
// OMS names the oms command, as for make.mjs.
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const oms = process.env.OMS ? process.env.OMS.split(' ') : [process.execPath, resolve(here, '../../../../cli/oms.mjs')];
const [command, ...args] = process.argv.slice(2);

if (command === 'prepare') {
  const [project, dubs, linesFile] = args.map((a) => resolve(a));
  const {voices, lines} = JSON.parse(readFileSync(linesFile, 'utf8'));
  for (const [lang, voice] of Object.entries(voices)) {
    const dir = join(dubs, lang);
    rmSync(dir, {recursive: true, force: true});
    cpSync(project, dir, {recursive: true, filter: (from) => !/[\\/](voice|renders?|\.motion-studio)([\\/]|$)/.test(from.slice(project.length))});
    const film = join(dir, 'film.tsx');
    let source = readFileSync(film, 'utf8').replace(/(<Film\b[^>]*\bvoice=)"[^"]*"/, `$1"${voice}"`);
    for (const [id, words] of Object.entries(lines)) {
      const line = new RegExp(`(<Line\\b[^>]*\\bid="${id}"[^>]*?)(\\s+text="[^"]*")?>[^<]*</Line>`);
      if (!line.test(source)) throw new Error(`No <Line id="${id}"> in ${film}`);
      source = source.replace(line, (_, open) => `${open}>${words[lang]}</Line>`);
    }
    writeFileSync(film, source);
    console.log(`${lang}: ${dir}`);
  }
} else if (command === 'render') {
  const dubs = resolve(args[0]);
  for (const lang of ['zh', 'ja', 'es']) {
    const dir = join(dubs, lang);
    if (!existsSync(dir)) continue;
    const out = join(dubs, `${lang}.mp4`);
    rmSync(out, {force: true});
    rmSync(out.replace(/\.mp4$/, '.srt'), {force: true});
    execFileSync(oms[0], [...oms.slice(1), 'render', dir, '--out', out], {stdio: 'inherit'});
  }
} else {
  throw new Error('Usage: node dub.mjs prepare PROJECT DUBS LINES.json | render DUBS');
}
