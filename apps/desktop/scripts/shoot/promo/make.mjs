#!/usr/bin/env node
// Make the website's hero film (studio-loop.<lang>.mp4 on openmotion.studio) from a take of ../shoot.sh, as an OMS film.
// Usage: node make.mjs RUN_DIR MUSIC OUT_DIR
//
// Each chapter is a title card (a headline that moves, on paper) that gives way, by a shape, to the Studio at work: the
// take's own seconds, cut and sped up, the camera on the part in use, a panel lifted off the screen as it matters, a
// ring where the pointer clicks. This script cuts those seconds from the take into media/, writes parts/timeline.json
// (every scene's length, clip times, camera, lifts and clicks), makes the effects with `oms sound`, renders the film
// once a language with `oms render` and lays the music and the take's narration under it with ffmpeg.
//
// MUSIC is Cat Walk by Arulo (Mixkit free licence: https://mixkit.co/free-stock-music/ , track 371), not kept here. Its
// drop (88.5 s into the track) falls as chapter 6 hits; the track starts wherever that puts it.
// OMS names the oms command (default: this checkout's apps/cli/oms.mjs, run by node); ffmpeg is the one on the PATH.
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [runArg, musicArg, outArg] = process.argv.slice(2);
if (!runArg || !musicArg || !outArg) throw new Error('Usage: node make.mjs RUN_DIR MUSIC OUT_DIR');
const run = resolve(runArg), music = resolve(musicArg), out = resolve(outArg);
const oms = process.env.OMS ? process.env.OMS.split(' ') : [process.execPath, resolve(here, '../../../../cli/oms.mjs')];
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {stdio: ['ignore', 'inherit', 'inherit']});
const probe = (file) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString());
const round = (x) => Math.round(x * 1000) / 1000;

const start = Number(readFileSync(join(run, 'rec-start'), 'utf8'));
const m = Object.fromEntries(JSON.parse(readFileSync(join(run, 'marks.json'), 'utf8')).map((x) => [x.name, (x.at - start) / 1000]));

const CARD = 1.6;   // a title card, its exit included
const EXIT = 0.4;   // the card's exit, over the Studio already playing beneath it
const DROP = 0.55;  // when chapter 6's headline lands, into its card: the music's drop
const TRACK_DROP = 88.5;
const END = 4.2;    // the closing card, held

// Parts of the 1920x1080 take (x, y, w, h).
const FULL = [0, 0, 1920, 1080];
const HOME = [310, 150, 1500, 844];
const STAGE = [390, 52, 1184, 666];
const FILM = [432, 75, 1100, 619];
const AGENT = [0, 540, 864, 486];
const LIBRARY = [420, 60, 1500, 844];
const DIALOG = [192, 108, 1536, 864];
const MARKING = [160, 110, 1100, 619];   // the bars marked and the note under them
const VOICE = [380, 40, 1540, 866];      // the voice view: its lines and the button that speaks them

// Each chapter: its seconds of the take ([from, to, speed] or [from, to, {len}], with the camera's rectangle), what is
// lifted off the screen and when (take time), and where the pointer clicks (take time, x, y).
const chapters = [
  {id: 'intro', exit: 'box', segs: [[m['play-v2'] + 4.6, m['play-v2'] + 8.1, 1, FULL]], tags: true},
  {id: 'ch1', exit: 'box',
    segs: [[m.brief - 0.4, m['brief-sent'] + 0.6, {len: 2.2}, HOME], [m.editor + 1, m.made - 0.2, {len: 0.6}, AGENT],
      [m['play-v1'] + 0.3, m['play-v1'] + 1.7, 1, STAGE]],
    lifts: [[m.brief + 0.6, m['brief-sent'] - 0.4, [352, 225, 1406, 217]]],
    clicks: [[m['brief-sent'] - 0.05, 1667, 358]]},
  {id: 'ch2', exit: 'blinds',
    segs: [[m.motions - 0.2, m['look-open'] + 1.2, {len: 1.6}, LIBRARY], [m['look-open'] + 1.2, m['look-sent'] + 0.5, {len: 1.1}, DIALOG],
      [m['look-sent'] + 1, m['look-done'] - 0.2, {len: 0.5}, AGENT], [m['play-look'] + 0.3, m['play-look'] + 1.5, 1, STAGE]],
    lifts: [[m['look-sent'] - 1.6, m['look-sent'] + 0.4, [655, 447, 615, 201]]],
    clicks: [[m['look-open'] - 0.05, 870, 347], [m['look-sent'] - 0.05, 1163, 604]]},
  {id: 'ch3', exit: 'iris', segs: [[m.drag - 0.3, m.drag + 2.6, {len: 2.6}, STAGE]], clicks: [[m.drag - 0.05, 481, 152]]},
  {id: 'ch4', exit: 'wipe',
    segs: [[m.note - 0.15, m.note + 6.4, {len: 2.4}, MARKING], [m.note + 6.4, m.sent + 1.2, {len: 1.6}, AGENT]],
    lifts: [[m.note + 0.3, m.note + 6.2, [470, 380, 345, 160]]],
    clicks: [[m.note + 6.1, 627, 505], [m.sent - 0.05, 352, 1029]]},
  {id: 'ch5', exit: 'box', segs: [[m.sent + 1.6, m['agent-done'] - 0.2, {len: 2.4}, AGENT]]},
  {id: 'ch6', exit: 'flash', segs: [[m['play-v2'] + 1.06, m['play-v2'] + 5.0, 1, FILM]]},
  {id: 'ch7', exit: 'wipe',
    segs: [[m.voice - 0.2, m['voice-sent'] + 0.8, {len: 1.4}, VOICE], [m['voice-sent'] + 0.8, m.voiced + 1.2, {len: 1.0}, AGENT],
      [m['play-voice'] + 0.3, m['play-voice'] + 4.7, 1, FILM]],
    lifts: [[m.voice + 0.3, m['voice-sent'] - 0.5, [425, 125, 925, 250]]],
    clicks: [[m.voice + 1.0, 1673, 32], [m['voice-sent'] - 0.3, 1672, 270]],
    narration: 2},
  {id: 'ch8', exit: 'box',
    segs: [[m['export-open'] - 0.2, m['export-start'] + 0.6, {len: 1.8}, DIALOG], [m['export-start'] + 0.6, m['export-done'] + 2.4, {len: 1.8}, FULL]],
    lifts: [[m['export-open'] + 0.6, m['export-start'] + 0.3, [650, 370, 610, 330]]],
    clicks: [[m['export-open'] - 0.05, 1803, 38], [m['export-start'] - 0.05, 1183, 664]]},
];

const media = join(here, 'media');
mkdirSync(media, {recursive: true});
for (const card of ['card-open.mp4', 'card-close.mp4']) copyFileSync(join(here, '..', card), join(media, card));

// Cut each chapter's seconds into one clip, and map take time to clip time.
const scenes = [{id: 'open', kind: 'card', dur: round(probe(join(media, 'card-open.mp4')))}];
for (const c of chapters) {
  const segs = c.segs.map(([a, b, sp, rect]) => {
    const speed = typeof sp === 'object' ? (b - a) / sp.len : sp;
    return {a, b, speed, rect, len: (b - a) / speed};
  });
  let at = 0;
  for (const s of segs) (s.at = at), (at += s.len);
  const clipTime = (x) => {
    const s = segs.find((s) => x >= s.a - 1e-6 && x <= s.b + 1e-6);
    return s ? round(s.at + (x - s.a) / s.speed) : null;
  };
  const seek = Math.max(0, segs[0].a - 1);
  const graph = segs.map((s, i) => `[0:v]trim=start=${(s.a - seek).toFixed(3)}:end=${(s.b - seek).toFixed(3)},setpts=(PTS-STARTPTS)/${s.speed.toFixed(4)},fps=30[s${i}]`);
  graph.push(`${segs.map((_, i) => `[s${i}]`).join('')}concat=n=${segs.length}:v=1:a=0,format=yuv420p[v]`);
  ff('-ss', seek.toFixed(3), '-i', join(run, 'raw.mp4'), '-filter_complex', graph.join(';'), '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-g', '15', join(media, `ui-${c.id}.mp4`));
  const uiLen = round(at);
  const uiStart = CARD - EXIT;
  scenes.push({
    id: c.id, kind: 'chapter', exit: c.exit, tags: !!c.tags, card: CARD, uiStart, uiLen, dur: round(uiStart + uiLen),
    cams: segs.map((s) => ({t: round(s.at), rect: s.rect})),
    lifts: (c.lifts ?? []).map(([a, b, rect]) => ({a: clipTime(a), b: clipTime(b), rect})).filter((l) => l.a !== null && l.b !== null),
    clicks: (c.clicks ?? []).map(([t, x, y]) => ({t: clipTime(t), x, y})).filter((k) => k.t !== null),
    narration: c.narration !== undefined ? round(segs[c.narration].at) : undefined,
  });
}
scenes.push({id: 'close', kind: 'card', dur: END});
let t = 0;
for (const s of scenes) (s.from = round(t)), (t += s.dur);
const total = round(t);
const at = (id) => scenes.find((s) => s.id === id);
const drop = round(at('ch6').from + DROP);
writeFileSync(join(here, 'parts', 'timeline.json'), JSON.stringify({total, drop, dropInCard: DROP, scenes}, null, 1));

// The effects: a cut as each card opens, a landing as its headline lands, a move as it gives way, a land on each click.
const cues = [];
for (const s of scenes.filter((s) => s.kind === 'chapter')) {
  cues.push(`${(s.from + 0.02).toFixed(2)}:cut`, `${(s.from + (s.id === 'ch6' ? DROP : 0.4)).toFixed(2)}:land`,
    `${(s.from + s.uiStart).toFixed(2)}:move:${EXIT}`);
  for (const k of s.clicks) cues.push(`${(s.from + s.uiStart + k.t).toFixed(2)}:land`);
}
rmSync(join(media, 'effects.wav'), {force: true});
execFileSync(oms[0], [...oms.slice(1), 'sound', here, '--cues', cues.join(', '), '--seconds', String(total),
  '--out', join(media, 'effects.wav')], {stdio: 'inherit'});

// Faces cut to the words the film writes.
for (const [family, weights] of [['Inter', '400,700,800'], ['JetBrains Mono', '500'], ['Noto Sans SC', '500,900']])
  execFileSync(oms[0], [...oms.slice(1), 'font', here, '--family', family, '--weights', weights], {stdio: 'ignore'});

if (process.env.RENDER === "0") {
  writeFileSync(join(here, "parts", "lang.json"), JSON.stringify({lang: (process.env.LANGS ?? "en").split(",")[0]}));
  process.exit(0);
}

// Render each language, then lay the music (its drop on chapter 6, sunk under the narration) and the narration under it.
mkdirSync(out, {recursive: true});
const ch7 = at('ch7');
const voiceAt = ch7.narration !== undefined ? ch7.from + ch7.uiStart + ch7.narration : null;
const voiceLen = 4.4;
const offset = TRACK_DROP - drop;
for (const lang of (process.env.LANGS ?? 'en,zh').split(',')) {
  writeFileSync(join(here, 'parts', 'lang.json'), JSON.stringify({lang}));
  const film = join(here, `film.${lang}.mp4`);
  rmSync(film, {force: true});
  rmSync(film.replace(/.mp4$/, '.srt'), {force: true});
  execFileSync(oms[0], [...oms.slice(1), 'render', here, '--out', film], {stdio: 'inherit'});
  const duck = voiceAt === null ? '1' : `1-0.7*clip((t-${(voiceAt - 0.35).toFixed(3)})/0.35,0,1)*clip((${(voiceAt + voiceLen + 0.35).toFixed(3)}-t)/0.35,0,1)`;
  const graph = [
    `[1:a]atrim=start=${offset.toFixed(3)}:duration=${total},asetpts=PTS-STARTPTS,afade=t=in:d=0.2,afade=t=out:st=${(total - 2.4).toFixed(3)}:d=2.4,volume=0.85,volume='${duck}':eval=frame[music]`,
    '[0:a]volume=0.6[fx]',
  ];
  const inputs = ['-i', film, '-i', music];
  let mix = '[music][fx]';
  if (voiceAt !== null && existsSync(join(run, 'export.mp4'))) {
    inputs.push('-i', join(run, 'export.mp4'));
    graph.push(`[2:a]atrim=start=0.3:duration=${voiceLen},asetpts=PTS-STARTPTS,afade=t=out:st=${voiceLen - 0.3}:d=0.3,adelay=${Math.round(voiceAt * 1000)}:all=1[voice]`);
    mix += '[voice]';
  }
  graph.push(`${mix}amix=inputs=${mix.split('][').length}:normalize=0:duration=first,alimiter=limit=0.7:level=disabled[a]`);
  ff(...inputs, '-filter_complex', graph.join(';'), '-map', '0:v', '-map', '[a]', '-vf', 'scale=1440:810:flags=lanczos',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart', join(out, `studio-loop.${lang}.mp4`));
}

const steps = scenes.filter((s) => /^ch\d$/.test(s.id)).map((s) => ({n: Number(s.id.slice(2)), at: round(s.from)}));
writeFileSync(join(out, 'chapters.json'), JSON.stringify({length: total, drop, music_from: round(offset), steps}, null, 1));
console.log(`total ${total}s · drop at ${drop}s · music from ${round(offset)}s of the track`);
for (const s of steps) console.log(`  ${String(s.n).padStart(2, '0')} at ${s.at.toFixed(2)}`);
