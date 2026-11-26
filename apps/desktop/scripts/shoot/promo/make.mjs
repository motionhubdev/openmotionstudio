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
// first drop falls on the timeline's drop (the motions' samples), and the track is spliced to its second loud section so
// it lasts the whole film.
// OMS names the oms command (default: this checkout's apps/cli/oms.mjs, run by node); ffmpeg is the one on the PATH.
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
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
// The track: 130 bpm. Its first drop is on a beat at 29.63 s; the first loud section ends on a bar at 57.23 s, the second
// runs from its downbeat at 88.68 s to a bar at 110.76 s. The bed plays from the film's start to the end of the first,
// then the second, then the first again from its drop, as long as the film needs.
const TRACK_DROP = 29.63;
const PIECES = (start) => [[start, 57.23], [88.68, 110.76], [29.63, 57.23], [88.68, 118]];
const END = 4.2;    // the closing card, held

// Parts of the 1920x1080 take (x, y, w, h).
const FULL = [0, 0, 1920, 1080];
const HOME = [310, 150, 1500, 844];
const STAGE = [390, 52, 1184, 666];
const FILM = [432, 75, 1100, 619];
const AGENT = [0, 540, 864, 486];
const LIBRARY = [415, 60, 1505, 847];
const DIALOG = [192, 108, 1536, 864];
const MARKING = [560, 100, 1000, 563];     // the marked dark half and the note beside it
const AGENTS = [0, 560, 860, 484];         // the agent menu, over the foot of the assistant
const VOICE = [400, 40, 1520, 855];        // the voice view: its lines and the voices
const PICKER = [1000, 100, 920, 518];      // the voices, searched and chosen
const EXPORTING = [1380, 0, 540, 304];     // the export button, counting

// Each chapter: its seconds of the take ([from, to, speed] or [from, to, {len}], with the camera's rectangle and how:
// see the cut below), more camera moves (take time, rectangle, seconds), what is lifted off the screen and when (take
// time), where the pointer clicks (take time, x, y), and its title card's length. Operations run at their own speed (or
// near it); only waiting is cut short.
const browse = [1, 2, 3, 4].filter((k) => m[`browse-${k}`] !== undefined).map((k) => m[`browse-${k}`]);
// The first motion opened shows the catalogue (its reel is still loading); the next two play their reels; the last one's
// reel loads too late, and its look is in the samples that follow.
const reels = browse.slice(1, 3).map((b) => {
  // From when its reel plays: at least 1.5 s after the click, later if the take saw it start later.
  const k = browse.indexOf(b) + 1;
  return Math.max(b + 1.5, (m[`reel-${k}`] ?? 0) + 0.6);
});
const applied = m['look-sent'] !== undefined;  // whether a look was applied in the take
const BEAT = 0.46;  // the music's beat: the samples change every two
const BEAT_EXACT = 60 / 130;
// The first cut (the take's project before the note and the voice, from its history: first.mp4, scenes at 0, 5 and 10 s)
// and the finished film (export.mp4, as the take exported it).
const FIRST = existsSync(join(run, 'first.mp4')) ? join(run, 'first.mp4') : join(run, 'export.mp4');
const FINAL = join(run, 'export.mp4');
// The film itself restyled in motionhub's motions (renders of the take's project, each in one motion: PROMO_STYLED/<slug>.mp4),
// all at the same moment, two beats each on the drop; then the film in its own look.
const STYLED = process.env.PROMO_STYLED ?? join(run, 'styled');
const STYLED_AT = 2.4;  // the first scene: the Sun lighting half of the Moon
const samples = [['clay-world', 'Clay World'], ['night-diagram', 'Night Diagram'], ['ink-scroll', 'Ink Scroll'], ['pixel-quest', 'Pixel Quest'],
  ['riso-pop', 'Riso Pop']].map(([slug, name]) => [join(STYLED, `${slug}.mp4`), name, STYLED_AT]).filter(([file]) => existsSync(file));
// The film spoken in other languages (dub.mjs): each a render of the take's project with its lines translated.
const DUBS = process.env.PROMO_DUBS ?? join(run, 'dubs');
const dubs = ['zh', 'ja', 'es'].map((lang) => [lang, join(DUBS, `${lang}.mp4`)]).filter(([, file]) => existsSync(file));
// How long each language is heard: its first line, said whole (it starts 0.4 s in; the scene changes at 5 s).
const LINE = {en: 3.9, zh: 3.2, ja: 5.0, es: 4.9};
const chapters = [
  {id: 'intro', exit: 'box', segs: [[m['play-look'] + 3.6, m['play-look'] + 8.0, 1, FULL]], tags: true},
  // The sentence and the agent at work are drawn (parts/prompt.tsx, PRE seconds); then the film it made, full frame, six
  // beats of each of its three scenes, cut on the beat.
  {id: 'ch1', exit: 'box', pre: 10, onBeat: true, cues: [[5, 'land'], [7, 'count'], [8, 'count'], [9, 'count']],
    segs: [[0.4, 0.4 + 6 * BEAT_EXACT, 1, FULL, {src: FIRST}], [5.4, 5.4 + 6 * BEAT_EXACT, 1, FULL, {src: FIRST}],
      [11.3, 11.3 + 6 * BEAT_EXACT, 1, FULL, {src: FIRST}]]},
  // Over the card's motions, then on the drop: the film restyled in motionhub's motions, two beats each, then in its own.
  {id: 'ch2', exit: 'blinds',
    segs: [...samples.map(([file, name, from]) => [from, from + 2 * BEAT_EXACT, 1, FULL, {src: file, label: {en: name, zh: name}}]),
      [STYLED_AT, STYLED_AT + 4 * BEAT_EXACT, 1, FULL, {src: FINAL, label: {en: 'Its own look', zh: '它自己的风格'}}]],
    drop: {seg: 0}},
  // Drawn (parts/drawn.tsx): each its length in beats (pre) and its effects (cues: [beat, role]).
  {id: 'ch3', exit: 'iris', pre: 13, cues: [[1, 'draw'], [3, 'move'], [7, 'land'], [9, 'move']], segs: []},
  {id: 'ch4', exit: 'wipe', card: 2.6, pre: 10,
    cues: [[1, 'count'], [2, 'count'], [3, 'count'], [4, 'count'], [5, 'land'], [6, 'count'], [6.5, 'count'], [7, 'count'], [7.5, 'count'], [8.5, 'land']], segs: []},
  // A voice chosen; then the film heard in English, and in other languages in turn.
  {id: 'ch5', exit: 'wipe', pre: 7, cues: [[1, 'count'], [2, 'count'], [3, 'land']],
    segs: [[0.2, 0.2 + LINE.en, 1, FULL, {src: FINAL, lang: 'en', voice: {src: FINAL, from: 0.2}}],
      ...dubs.map(([lang, file]) => [0.2, Math.min(4.95, 0.2 + LINE[lang]), 1, FULL, {src: file, lang, voice: {src: file, from: 0.2}}])]},
  {id: 'ch6', exit: 'box', pre: 8, cues: [[1, 'land'], [2, 'out'], [3, 'count']], segs: []},
];

const media = join(here, 'media');
mkdirSync(media, {recursive: true});
for (const card of ['card-open.mp4', 'card-close.mp4']) copyFileSync(join(here, '..', card), join(media, card));
// The Moon before and after the note (chapter 3), and the exported film's picture (chapter 6).
ff('-ss', '2.4', '-i', FIRST, '-frames:v', '1', join(media, 'moon-before.png'));
ff('-ss', '2.4', '-i', FINAL, '-frames:v', '1', join(media, 'moon-after.png'));
// The agents' own marks, as the Studio shows them.
for (const icon of ['claude-code.png', 'codex.png']) copyFileSync(join(here, '../../../src/renderer/src/agent-icons', icon), join(media, icon));
for (const [icon, as] of [['googlegemini.svg', 'gemini.svg'], ['deepseek.svg', 'deepseek.svg']]) copyFileSync(join(here, '../../../src/renderer/src/provider-icons', icon), join(media, as));

// Cut each chapter's seconds into one clip, and map take time to clip time. A segment is [from, to, speed or {len},
// camera rectangle, how]: `how` may name another file to take it from (`src`, its picture cropped to `crop` and filled
// to the frame), a label to show over it (`label`, {en, zh}), the language it speaks (`lang`), the narration under it
// (`voice`: a file and the second of it the segment's start matches) and a camera glide (`move`).
const lenOf = ([a, b, sp]) => (typeof sp === 'object' ? sp.len : (b - a) / sp);
// A chapter on the beat (onBeat) ends where the music's beat falls: from its film to the drop is a whole number of beats,
// its last segment lengthened to make it so.
for (const [i, c] of chapters.entries()) {
  if (!c.onBeat) continue;
  const next = chapters.slice(i + 1).find((d) => d.drop);
  if (next !== chapters[i + 1]) throw new Error('an onBeat chapter must come just before the one with the drop');
  const rest = c.segs.reduce((x, s) => x + lenOf(s), 0) + (next.card ?? CARD) - EXIT + next.segs.slice(0, next.drop.seg).reduce((x, s) => x + lenOf(s), 0);
  const last = c.segs.at(-1);
  last[1] += (BEAT_EXACT - (rest % BEAT_EXACT)) % BEAT_EXACT;
}
const scenes = [{id: 'open', kind: 'card', dur: round(probe(join(media, 'card-open.mp4')))}];
let tRun = scenes[0].dur, dropAt = null;
for (const c of chapters) {
  const segs = c.segs.map(([a, b, sp, rect, how = {}]) => {
    const speed = typeof sp === 'object' ? (b - a) / sp.len : sp;
    return {a, b, speed, rect, ...how, len: (b - a) / speed};
  });
  let at = 0;
  for (const s of segs) (s.at = at), (at += s.len);
  const clipTime = (x) => {
    const s = segs.find((s) => !s.src && x >= s.a - 1e-6 && x <= s.b + 1e-6);
    return s ? round(s.at + (x - s.a) / s.speed) : null;
  };
  const own = segs.filter((s) => !s.src);
  const seek = own.length ? Math.max(0, Math.min(...own.map((s) => s.a)) - 1) : 0;
  const inputs = own.length ? ['-ss', seek.toFixed(3), '-i', join(run, 'raw.mp4')] : [];
  const graph = segs.map((s, i) => {
    if (!s.src) return `[0:v]trim=start=${(s.a - seek).toFixed(3)}:end=${(s.b - seek).toFixed(3)},setpts=(PTS-STARTPTS)/${s.speed.toFixed(4)},fps=30[s${i}]`;
    const k = inputs.filter((x) => x === '-i').length;
    inputs.push('-ss', s.a.toFixed(3), '-t', (s.b - s.a + 0.5).toFixed(3), '-i', s.src);
    const crop = s.crop ? `crop=${s.crop[2]}:${s.crop[3]}:${s.crop[0]}:${s.crop[1]},` : '';
    return `[${k}:v]trim=duration=${(s.b - s.a).toFixed(3)},${crop}scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,setpts=(PTS-STARTPTS)/${s.speed.toFixed(4)},fps=30[s${i}]`;
  });
  graph.push(`${segs.map((_, i) => `[s${i}]`).join('')}concat=n=${segs.length}:v=1:a=0,format=yuv420p[v]`);
  rmSync(join(media, `ui-${c.id}.mp4`), {force: true});
  if (segs.length) ff(...inputs, '-filter_complex', graph.join(';'), '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-g', '15', join(media, `ui-${c.id}.mp4`));
  const uiLen = round(at);
  const card = c.card ?? CARD;
  const uiStart = card - EXIT;
  // A drawn part (pre, in beats) starts on the music's beat: after the drop, it waits beat0 seconds for one; before it,
  // the chapter is onBeat (above) and its drawn part ends on one.
  const beat0 = c.pre && dropAt !== null ? round((((dropAt - (tRun + uiStart)) % BEAT_EXACT) + BEAT_EXACT) % BEAT_EXACT) : 0;
  const pre = c.pre ? beat0 + c.pre * BEAT_EXACT : 0;
  const cams = [...segs.map((s) => ({t: round(s.at), rect: s.rect, move: s.move})),
    ...(c.cams ?? []).map(([x, rect, move]) => ({t: clipTime(x), rect, move}))].filter((k) => k.t !== null).sort((p, q) => p.t - q.t);
  scenes.push({
    id: c.id, kind: 'chapter', exit: c.exit, tags: !!c.tags, card, uiStart, pre: round(pre), beat0, cues: c.cues ?? [], uiLen, dur: round(uiStart + pre + uiLen), cams,
    drop: c.drop !== undefined ? (typeof c.drop === 'object' ? round(segs[c.drop.seg].at) : clipTime(c.drop)) : undefined,
    lifts: (c.lifts ?? []).map(([a, b, rect, grow]) => ({a: clipTime(a), b: clipTime(b), rect, grow})).filter((l) => l.a !== null && l.b !== null),
    clicks: (c.clicks ?? []).map(([t, x, y]) => ({t: clipTime(t), x, y})).filter((k) => k.t !== null),
    labels: segs.filter((s) => s.label || s.lang).map((s) => ({t: round(s.at), len: round(s.len), text: s.label, lang: s.lang})),
    voices: segs.filter((s) => s.voice).map((s) => ({at: round(s.at), len: round(s.len), src: s.voice.src, from: s.voice.from})),
  });
  const done = scenes.at(-1);
  if (done.drop !== undefined) dropAt = tRun + uiStart + pre + done.drop;
  tRun += done.dur;
}
scenes.push({id: 'close', kind: 'card', dur: END});
let t = 0;
for (const s of scenes) (s.from = round(t)), (t += s.dur);
const total = round(t);
// The music's drop: on the moment a chapter names, else on the second chapter's Studio.
const dropScene = scenes.find((s) => s.drop !== undefined && s.drop !== null) ?? scenes[2];
const drop = round(dropScene.from + dropScene.uiStart + dropScene.pre + (dropScene.drop ?? 0));
// Written only when it changes, so the films rendered from it are known to be current (below).
const timelineFile = join(here, 'parts', 'timeline.json');
const timelineText = JSON.stringify({total, drop, scenes}, null, 1);
if (!existsSync(timelineFile) || readFileSync(timelineFile, 'utf8') !== timelineText) writeFileSync(timelineFile, timelineText);

// The effects: a cut as each card opens, a landing as its headline lands, a move as it gives way, a land on each click,
// a drawn part's own on its beats, a cut where its clip comes in.
const cues = [];
for (const s of scenes.filter((s) => s.kind === 'chapter')) {
  cues.push(`${(s.from + 0.02).toFixed(2)}:cut`, `${(s.from + 0.4).toFixed(2)}:land`,
    `${(s.from + s.uiStart).toFixed(2)}:move:${EXIT}`);
  for (const k of s.clicks) cues.push(`${(s.from + s.uiStart + s.pre + k.t).toFixed(2)}:land`);
  if (s.pre) {
    for (const [k, role] of s.cues) cues.push(`${(s.from + s.uiStart + s.beat0 + k * BEAT_EXACT).toFixed(2)}:${role}`);
    if (s.uiLen) cues.push(`${(s.from + s.uiStart + s.pre).toFixed(2)}:cut`);
  }
}
rmSync(join(media, 'effects.wav'), {force: true});
execFileSync(oms[0], [...oms.slice(1), 'sound', here, '--cues', cues.join(', '), '--seconds', String(total),
  '--out', join(media, 'effects.wav')], {stdio: 'inherit'});

// Faces cut to the words the film writes.
for (const [family, weights] of [['Inter', '400,700,800'], ['JetBrains Mono', '500'], ['Noto Sans SC', '500,900']])
  execFileSync(oms[0], [...oms.slice(1), 'font', here, '--family', family, '--weights', weights], {stdio: 'ignore'});

// The sound. The music: from its first drop (TRACK_DROP, on the timeline's drop) to the end of that section (SPLICE[0]),
// then on from the start of its second (SPLICE[1]), so it runs the film's whole length and ends as the track does. The
// narration: each voiced segment's own file, from where its picture starts; the music sinks under each line. Each is
// made once, as a WAV the film's length.
mkdirSync(out, {recursive: true});
const narration = scenes.flatMap((s) => (s.voices ?? []).map((v) => ({...v, at: s.from + s.uiStart + (s.pre ?? 0) + v.at})));
const trackAt = TRACK_DROP - drop;  // where in the track the film's first second is (before 0: the film waits for it)
const lead = Math.max(0, -trackAt);
const under = narration.map((v) => `clip((t-${(v.at - 0.3).toFixed(3)})/0.3,0,1)*clip((${(v.at + v.len + 0.3).toFixed(3)}-t)/0.3,0,1)`);
const duck = under.length ? `1-0.7*min(1,${under.join('+')})` : '1';
const bed = join(media, 'music-bed.wav');
const pieces = PIECES(Math.max(0, trackAt));
ff(...pieces.flatMap(() => ['-i', music]), '-filter_complex',
  pieces.map(([a, b], i) => `[${i}:a]atrim=start=${a.toFixed(3)}:end=${b},asetpts=PTS-STARTPTS[p${i}];`).join('') +
  pieces.slice(1).reduce((acc, _, i) => acc + `${i ? `[x${i}]` : '[p0]'}[p${i + 1}]acrossfade=d=0.06:c1=tri:c2=tri[x${i + 1}];`, '') +
  `[x${pieces.length - 1}]adelay=${Math.round(lead * 1000)}:all=1,apad,atrim=duration=${total},` +
  `afade=t=in:d=0.2,afade=t=out:st=${(total - 2.4).toFixed(3)}:d=2.4,volume=0.85,volume='${duck}':eval=frame[a]`,
  '-map', '[a]', '-t', String(total), '-ar', '48000', '-ac', '2', bed);
const voice = join(media, 'narration.wav');
if (narration.length) {
  const inputs = narration.flatMap((v) => ['-i', v.src]);
  const graph = narration.map((v, i) => {
    const len = Math.max(0.3, v.len - 0.1);
    return `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start=${v.from.toFixed(3)}:duration=${len.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `afade=t=out:st=${(len - 0.25).toFixed(3)}:d=0.25,adelay=${Math.round(v.at * 1000)}:all=1[v${i}]`;
  });
  graph.push(`${narration.map((_, i) => `[v${i}]`).join('')}amix=inputs=${narration.length}:normalize=0:duration=longest,apad[a]`);
  // Padded to the film's length, and no further: -t ends it.
  ff(...inputs, '-filter_complex', graph.join(';'), '-map', '[a]', '-t', String(total), '-ar', '48000', '-ac', '2', voice);
} else {
  ff('-f', 'lavfi', '-i', `anullsrc=r=48000:cl=stereo`, '-t', String(total), voice);
}
// The film plays all three (film.tsx): the beds above, the effects. A first look is the web player of one language
// (PLAYER=1: out/player-<lang>/, opened in a browser, nothing rendered); the finished film renders each language and
// takes it to the website's size.
if (process.env.RENDER === '0') {
  writeFileSync(join(here, 'parts', 'lang.json'), JSON.stringify({lang: (process.env.LANGS ?? 'en').split(',')[0]}));
  process.exit(0);
}
const timelineAt = statSync(join(here, 'parts', 'timeline.json')).mtimeMs;
for (const lang of (process.env.LANGS ?? (process.env.PLAYER ? 'en' : 'en,zh')).split(',')) {
  writeFileSync(join(here, 'parts', 'lang.json'), JSON.stringify({lang}));
  if (process.env.PLAYER) {
    const player = join(out, `player-${lang}`);
    rmSync(player, {recursive: true, force: true});
    execFileSync(oms[0], [...oms.slice(1), 'player', here, '--out', player], {stdio: 'inherit'});
    continue;
  }
  const film = join(here, `film.${lang}.mp4`);
  // A render made since this timeline was written, in this language, is this film already.
  if (!(existsSync(film) && statSync(film).mtimeMs > timelineAt)) {
    rmSync(film, {force: true});
    rmSync(film.replace(/\.mp4$/, '.srt'), {force: true});
    execFileSync(oms[0], [...oms.slice(1), 'render', here, '--out', film], {stdio: 'inherit'});
  }
  ff('-i', film, '-map', '0:v', '-map', '0:a', '-t', String(total), '-vf', 'scale=1440:810:flags=lanczos', '-af', 'alimiter=limit=0.7:level=disabled',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart', join(out, `studio-loop.${lang}.mp4`));
}

const steps = scenes.filter((s) => /^ch\d$/.test(s.id)).map((s) => ({n: Number(s.id.slice(2)), at: round(s.from)}));
writeFileSync(join(out, 'chapters.json'), JSON.stringify({length: total, drop, music_from: round(trackAt), steps}, null, 1));
console.log(`total ${total}s · drop at ${drop}s · music from ${round(trackAt)}s of the track, in pieces ${PIECES(Math.max(0, trackAt)).map(([a, b]) => `${round(a)}–${b}`).join(', ')}`);
for (const s of steps) console.log(`  ${String(s.n).padStart(2, '0')} at ${s.at.toFixed(2)}`);
