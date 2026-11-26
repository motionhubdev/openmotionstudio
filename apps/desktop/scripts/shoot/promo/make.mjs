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
// drop (88.5 s into the track) falls as the film first plays in its new look; the track starts wherever that puts it.
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
const TRACK_DROP = 88.5;
const END = 4.2;    // the closing card, held

// Parts of the 1920x1080 take (x, y, w, h).
const FULL = [0, 0, 1920, 1080];
const HOME = [310, 150, 1500, 844];
const STAGE = [390, 52, 1184, 666];
const FILM = [432, 75, 1100, 619];
const AGENT = [0, 540, 864, 486];
const LIBRARY = [415, 60, 1505, 847];
const DIALOG = [192, 108, 1536, 864];
const MARKING = [700, 120, 1000, 563];     // the marked Moon and the note beside it
const AGENTS = [0, 560, 860, 484];         // the agent menu, over the foot of the assistant
const VOICE = [400, 40, 1520, 855];        // the voice view: its lines and the voices
const PICKER = [1000, 100, 920, 518];      // the voices, searched and chosen
const EXPORTING = [1380, 0, 540, 304];     // the export button, counting

// Each chapter: its seconds of the take ([from, to, speed] or [from, to, {len}], with the camera's rectangle and
// {move: seconds} to glide there rather than cut), more camera moves (take time, rectangle, seconds), what is lifted
// off the screen and when (take time), where the pointer clicks (take time, x, y), and its title card's length.
// Operations run at their own speed (or near it); only waiting is cut short.
const browse = [1, 2, 3, 4].filter((k) => m[`browse-${k}`] !== undefined).map((k) => m[`browse-${k}`]);
const applied = m['look-sent'] !== undefined;  // whether a look was applied in the take
const chapters = [
  {id: 'intro', exit: 'box', segs: [[m['play-look'] + 3.8, m['play-look'] + 8.0, 1, FULL]], tags: true},
  {id: 'ch1', exit: 'box',
    segs: [[m.brief - 0.3, m.brief + 1.9, 1, HOME], [m['brief-sent'] - 1.1, m['brief-sent'] + 0.5, 1, HOME],
      [m.editor + 1, m.made - 0.2, {len: 2.6}, AGENT], [m['play-v1'] + 0.3, m['play-v1'] + 4.3, 1, STAGE]],
    lifts: [[m.brief + 0.5, m.brief + 1.9, [352, 225, 1406, 217]]],
    clicks: [[m['brief-sent'] - 0.05, 1667, 358]]},
  // The catalogue, every poster loaded; then each motion opened, once its reel plays (about 1.3 s on); then, if one was
  // applied, its dialog and the agent restyling; then the film plays.
  {id: 'ch2', exit: 'blinds',
    segs: [[browse[0] - 1.8, browse[0] + 0.2, 1, LIBRARY],
      ...browse.map((b) => [b + 1.3, b + 3.1, 1, LIBRARY]),
      ...(applied ? [[m['look-open'] - 0.3, m['look-sent'] + 0.4, {len: 1.9}, DIALOG], [m['look-sent'] + 1, m['look-done'] - 0.2, {len: 0.6}, AGENT]] : []),
      [m['play-look'] + 1.0, m['play-look'] + 4.5, 1, STAGE]],
    lifts: [...browse.map((b) => [b + 1.5, b + 3.0, [1478, 215, 420, 262], 0.6]), ...(applied ? [[m['look-sent'] - 1.4, m['look-sent'] + 0.3, [655, 447, 615, 201]]] : [])],
    clicks: applied ? [[m['look-sent'] - 1.75, 1560, 1029], [m['look-sent'] - 0.05, 1164, 600]] : [],
    drop: m['play-look'] + 1.0},
  {id: 'ch3', exit: 'iris',
    segs: [[m.drag - 1.0, m.drag + 2.2, 1, STAGE], [m.note - 0.2, m.note + 4.8, {len: 3.3}, MARKING],
      [m.sent - 0.7, m.sent + 0.4, 1, AGENT], [m.sent + 1.6, m['agent-done'] - 0.2, {len: 0.8}, AGENT],
      [m['play-v2'] + 0.8, m['play-v2'] + 4.2, 1, FILM]],
    lifts: [[m.note + 0.3, m.note + 4.6, [1205, 165, 340, 150]]],
    clicks: [[m.drag - 0.05, 760, 170], [m.note + 4.4, 1360, 280], [m.sent - 0.05, 352, 1029]]},
  {id: 'ch4', exit: 'wipe', card: 2.6,
    segs: [[m['agents-open'] - 0.6, m['agents-close'] + 0.3, 1.25, AGENTS]],
    lifts: [[m['agents-open'] + 0.4, m['agents-close'] - 0.1, [10, 540, 385, 485], 0.25]],
    clicks: [[m['agents-open'] - 0.05, 270, 1029], [m['agents-models'] - 0.05, 90, 1010]]},
  {id: 'ch5', exit: 'wipe',
    segs: [[m.voice - 0.5, m['voice-sent'] + 0.6, 1.4, VOICE], [m['voice-sent'] + 0.6, m.voiced + 1.0, {len: 1.8}, AGENT],
      [m['play-voice'] + 0.3, m['play-voice'] + 7.6, 1, FILM]],
    cams: [[m.voice + 1.6, PICKER, 0.8]],
    lifts: [[m['voice-search'] - 0.4, m['voice-sent'] + 0.3, [1540, 130, 360, 560], 0.2]],
    clicks: [[m.voice - 0.05, 1673, 32], [m['voice-chosen'] - 0.05, 1710, 414], [m['voice-sent'] - 0.05, 1650, 633]],
    narration: 2},
  {id: 'ch6', exit: 'box',
    segs: [[m['export-open'] - 0.3, m['export-start'] + 0.6, {len: 3.2}, DIALOG], [m['export-start'] + 0.6, m['export-done'] + 1.5, {len: 4.2}, FULL]],
    cams: [[m['export-start'] + 0.8, EXPORTING, 1.2]],
    lifts: [[m['export-open'] + 0.8, m['export-start'] - 0.15, [650, 370, 610, 330]]],
    clicks: [[m['export-open'] - 0.05, 1803, 38], [m['export-start'] - 0.05, 1183, 664]]},
];

const media = join(here, 'media');
mkdirSync(media, {recursive: true});
for (const card of ['card-open.mp4', 'card-close.mp4']) copyFileSync(join(here, '..', card), join(media, card));
// The agents' own marks, as the Studio shows them.
for (const icon of ['claude-code.png', 'codex.png']) copyFileSync(join(here, '../../../src/renderer/src/agent-icons', icon), join(media, icon));

// Cut each chapter's seconds into one clip, and map take time to clip time.
const scenes = [{id: 'open', kind: 'card', dur: round(probe(join(media, 'card-open.mp4')))}];
for (const c of chapters) {
  const segs = c.segs.map(([a, b, sp, rect, how]) => {
    const speed = typeof sp === 'object' ? (b - a) / sp.len : sp;
    return {a, b, speed, rect, move: how?.move, len: (b - a) / speed};
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
  const card = c.card ?? CARD;
  const uiStart = card - EXIT;
  const cams = [...segs.map((s) => ({t: round(s.at), rect: s.rect, move: s.move})),
    ...(c.cams ?? []).map(([x, rect, move]) => ({t: clipTime(x), rect, move}))].filter((k) => k.t !== null).sort((p, q) => p.t - q.t);
  scenes.push({
    id: c.id, kind: 'chapter', exit: c.exit, tags: !!c.tags, card, uiStart, uiLen, dur: round(uiStart + uiLen), cams,
    drop: c.drop !== undefined ? clipTime(c.drop) : undefined,
    lifts: (c.lifts ?? []).map(([a, b, rect, grow]) => ({a: clipTime(a), b: clipTime(b), rect, grow})).filter((l) => l.a !== null && l.b !== null),
    clicks: (c.clicks ?? []).map(([t, x, y]) => ({t: clipTime(t), x, y})).filter((k) => k.t !== null),
    narration: c.narration !== undefined ? {at: round(segs[c.narration].at), len: round(segs[c.narration].len)} : undefined,
  });
}
scenes.push({id: 'close', kind: 'card', dur: END});
let t = 0;
for (const s of scenes) (s.from = round(t)), (t += s.dur);
const total = round(t);
const at = (id) => scenes.find((s) => s.id === id);
// The music's drop: on the moment a chapter names (take time), else on the second chapter's Studio.
const dropScene = scenes.find((s) => s.drop !== undefined && s.drop !== null) ?? scenes[2];
const drop = round(dropScene.from + dropScene.uiStart + (dropScene.drop ?? 0));
writeFileSync(join(here, 'parts', 'timeline.json'), JSON.stringify({total, drop, scenes}, null, 1));

// The effects: a cut as each card opens, a landing as its headline lands, a move as it gives way, a land on each click.
const cues = [];
for (const s of scenes.filter((s) => s.kind === 'chapter')) {
  cues.push(`${(s.from + 0.02).toFixed(2)}:cut`, `${(s.from + 0.4).toFixed(2)}:land`,
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

// Render each language, then lay the music (its drop where the timeline says, sunk under the narration) and the
// narration under it: the take's own export, from where the Studio played it.
mkdirSync(out, {recursive: true});
const voiced = scenes.find((s) => s.narration);
const voiceAt = voiced ? voiced.from + voiced.uiStart + voiced.narration.at : null;
const voiceLen = voiced ? voiced.narration.len - 0.2 : 0;
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
