// The preview bridge protocol: the messages between the Studio and a film's preview frame
// (docs/tech/architecture.md, "The film").

import type { FilmLine } from '@motionhub/runtime';
import type { FilmSound } from './sound';

export interface FilmInfo {
  seconds: number;
  width: number;
  height: number;
  fps: number;
  /** Its scenes in order: its <Film>'s, end to end. */
  scenes: SceneInfo[];
  /** The film's own layers, drawn across every scene. */
  layers: LayerBox[];
  /** Every <Sound> it plays, the film's own and its scenes', in the film's seconds (shared/sound.ts). */
  sounds: FilmSound[];
  /** Whether it draws its lines as captions (<Film captions>), whole or word by word. */
  captions: boolean | 'words';
  /** The voice its lines are spoken in (<Film voice="provider:name">), or null. */
  voice: string | null;
  /** Its voiced lines' clips, each where its line is said: the narration the preview plays and the export mixes. */
  narration: SpokenLine[];
  /** Each voiced line's speech, by line id, as the runtime times lines by it (its `voice`). */
  speech: Record<string, { seconds: number; words: { text: string; start: number; end: number }[] }>;
}

/** A voiced line's clip (voice/<key>.mp3), from `at` to `until` in the film's seconds. */
export interface SpokenLine {
  line: string;
  src: string;
  at: number;
  until: number;
}

/** A box of the frame a <Layer> draws in, in the film's pixels. */
export interface LayerBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

/** One <Scene> of a film: its span, its layers and what it says. */
export interface SceneInfo {
  id: string;
  /** Seconds into the film. */
  start: number;
  duration: number;
  layers: LayerBox[];
  /** What it says, each line with when it is said, in the film's seconds. */
  lines: FilmLine[];
}

/** A box on the frame, in fractions of its width and height. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The element drawn at a point the person picked, as the page describes it. */
export interface PickedElement {
  /** Its place among its ancestors: `div#root > h1#title.clip`. */
  path: string;
  /** Its words, shortened. */
  text: string;
  /** Its data-* attributes, src, href, alt and aria-label. */
  attributes: Record<string, string>;
  /** The computed styles that say how it looks: font, size, weight, colour, and background, opacity and transform where set. */
  styles: Record<string, string>;
  /** The <Scene> and the <Layer> it is drawn in, for a film of scenes. */
  scene?: string;
  layer?: string;
  /** Its words in full when it holds nothing but text: the only words a tweak can try on the picture. */
  ownText?: string;
  /** The weights its face is declared in (@font-face), when the film declares it: the only ones it draws in. */
  weights?: string[];
}

/**
 * The weights the first family of a `font-family` stack is declared in among `faces` (the page's FontFaces), as
 * `font-weight` values, lightest first: a range (a variable face) gives each hundred in it. None when no face is
 * declared for that family, which then draws in whatever the machine has.
 */
export function declaredWeights(stack: string, faces: Iterable<{ family: string; weight: string }>): string[] | undefined {
  const bare = (name: string) => name.trim().replace(/^["']|["']$/g, '').toLowerCase();
  const family = bare(stack.split(',')[0] ?? '');
  const weights = new Set<number>();
  for (const face of faces) {
    if (bare(face.family) !== family) continue;
    const [from, to = from] = face.weight.split(/\s+/).map((w) => (w === 'bold' ? 700 : w === 'normal' ? 400 : Number(w)));
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
    for (let w = Math.ceil(from! / 100) * 100; w <= to!; w += 100) weights.add(w);
    weights.add(from!);
  }
  return weights.size ? [...weights].sort((a, b) => a - b).map(String) : undefined;
}

/** The properties a picked element's look can be tried with on the picture, and changed through the agent. */
export const TWEAKABLE = ['font-size', 'font-weight', 'color', 'background-color', 'opacity'] as const;
export type Tweakable = (typeof TWEAKABLE)[number];

export type ToPreview =
  | { type: 'oms:play' }
  | { type: 'oms:pause' }
  | { type: 'oms:play-range'; start: number; end: number }
  | { type: 'oms:seek'; t: number }
  /** Whether the preview's sound is off. */
  | { type: 'oms:mute'; muted: boolean }
  /** The element drawn at a point, in fractions of the frame, or the one `depth` elements around it (studio/pick.js answers). */
  | { type: 'oms:pick'; x: number; y: number; depth?: number }
  /** Tries a look (and, for an element of text alone, words) on the element last picked, replacing any tried before; none restores it. */
  | { type: 'oms:tweak'; styles: Partial<Record<Tweakable, string>>; text?: string }
  /** Draws one layer alone, every other <Layer> hidden; null draws them all again (studio/pick.js). */
  | { type: 'oms:solo'; layer: string | null }
  /** oms's web player: the clip a frame asked for (clips/…), as its file's bytes, or why it has none. */
  | { type: 'oms:clip'; src: string; blob?: Blob; message?: string };

export type FromPreview =
  | { type: 'oms:ready'; film: FilmInfo }
  /** Where the picture is; from a still (?render=1) told where by its parent, with whether an image it shows is still loading. */
  | { type: 'oms:time'; t: number; playing: boolean; loading?: boolean }
  | { type: 'oms:error'; message: string }
  /** `levels` is how many elements, the innermost first, a pick at that point can step out through. */
  | { type: 'oms:picked'; element: PickedElement | null; box: Box | null; levels: number }
  /** oms's web player's frame, which loads nothing itself: asks its player for a clip the film carries beside it (clips/…). */
  | { type: 'oms:clip'; src: string };

/**
 * The script that moves a render page to `t` and resolves, once its images are decoded and its faces loaded, with the
 * page's own error or null: one round trip a frame. A DevTools screenshot after it draws the page as it now is.
 */
export const seekScript = (t: number): string =>
  `window.__oms.seek(${Number(t)}).then(() => Promise.all([...document.images].map(image => image.decode()).concat(document.fonts.ready))).then(() => window.__omsError ?? null)`;

/** What a frame shows that a picture alone does not say: text past the frame's edge, and faces that never loaded. */
export interface Inspection {
  /** Visible text running past an edge of the frame, by layer ("captions" for <Film captions>, "film" outside any layer): the first words of it, and which edges. */
  outside: { layer: string; text: string; edges: string[] }[];
  /**
   * Text that draws in a face the page never loaded, by layer: `family` is that face, the first in its stack not loaded
   * (a generic name when the stack falls to the machine's own), and `chars` the characters it draws, when the faces
   * loaded before it in the stack draw the rest (a Latin face before the one for Chinese), or empty when it draws all.
   */
  unloaded: { layer: string; family: string; chars: string }[];
  /** The layers that draw anything visible now: text, a picture, a shape, a ground or a border. */
  shown?: string[];
}

/** The script that inspects a render page as it now is (after a seek), giving an Inspection. */
export const inspectScript = `(() => {
  const width = innerWidth, height = innerHeight;
  const generic = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong']);
  const bare = (family) => family.trim().replace(/^["']|["']$/g, '').toLowerCase();
  const loaded = new Set([...document.fonts].filter((face) => face.status === 'loaded').map((face) => bare(face.family)));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const pixels = (font, char) => {
    context.clearRect(0, 0, 64, 64);
    context.font = font;
    context.fillText(char, 8, 48);
    return context.getImageData(0, 0, 64, 64).data;
  };
  const drawn = new Map();
  // Whether the loaded faces draw a character: drawn in them before a generic face, it is the generic face's own glyph,
  // pixel for pixel, when they lack it. (Widths do not tell: every face draws a Chinese character one em wide.) On a
  // machine with no face for it at all, it is drawn as the first face's missing-glyph box instead, which differs from
  // the generic face's: the box an unassigned code point (U+0378) draws in the same faces.
  const covers = (style, faces, char) => {
    const key = style + '|' + faces + '|' + char;
    if (!drawn.has(key)) {
      const font = style + ' 40px ' + faces + ', monospace';
      if (!drawn.has(font)) drawn.set(font, pixels(font, '\\u0378'));
      const theirs = pixels(font, char), fallback = pixels(style + ' 40px monospace', char), box = drawn.get(font);
      drawn.set(key, (theirs.some((value, i) => value !== fallback[i]) || !fallback.some((value) => value)) && theirs.some((value, i) => value !== box[i]));
    }
    return drawn.get(key);
  };
  const outside = new Map(), unloaded = new Map();
  // Every text the film draws: in a layer, named by it; in the captions <Film captions> draws over everything, as
  // "captions"; anywhere else, as "film".
  const placeOf = (element) => {
    const layer = element.closest('[data-layer]');
    if (layer) return layer.getAttribute('data-layer');
    for (let e = element; e; e = e.parentElement) if (e.style && e.style.zIndex === '2147483647') return 'captions';
    return 'film';
  };
  {
    const walker = document.createTreeWalker(document.getElementById('root') || document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\\s+/g, ' ').trim();
      const element = node.parentElement;
      if (!text || !element || element.closest('style, script') || !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const id = placeOf(element);
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      const edges = [box.left < -1 && 'left', box.top < -1 && 'top', box.right > width + 1 && 'right', box.bottom > height + 1 && 'bottom'].filter(Boolean);
      if (edges.length) outside.set(id + '|' + text, { layer: id, text: text.slice(0, 40), edges });
      const computed = getComputedStyle(element);
      const stack = computed.fontFamily.split(',').map((family) => family.trim()).filter(Boolean);
      const first = stack.findIndex((family) => !loaded.has(bare(family)));
      if (first < 0) continue;
      const family = stack[first].replace(/^["']|["']$/g, '');
      // The first face not loaded: it and every one after it, up to a loaded or generic face, are said at once, so a
      // stack of a Latin and a Chinese face, neither loaded, names both in one check rather than one each.
      if (first === 0) {
        for (const each of stack) {
          const name = each.replace(/^["']|["']$/g, '');
          if (generic.has(bare(name)) || loaded.has(bare(name))) break;
          unloaded.set(id + '|' + bare(name), { layer: id, family: name, chars: '' });
        }
        continue;
      }
      const style = computed.fontStyle + ' ' + computed.fontWeight;
      const faces = stack.slice(0, first).join(', ');
      const missed = [...new Set(text.replace(/\\s/g, ''))].filter((char) => !covers(style, faces, char));
      if (!missed.length) continue;
      const seen = unloaded.get(id + '|' + bare(family));
      const chars = [...new Set((seen ? seen.chars : '') + missed.join(''))].slice(0, 40).join('');
      unloaded.set(id + '|' + bare(family), { layer: id, family, chars });
    }
  }
  // A layer draws something when any element in it, seen and of some size, holds text, is a picture or a shape, or
  // paints a ground, an image or a border.
  const PAINTED = new Set(['img', 'canvas', 'video', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'image', 'use']);
  const shown = new Set();
  for (const layer of document.querySelectorAll('[data-layer]')) {
    const id = layer.getAttribute('data-layer');
    if (shown.has(id)) continue;
    for (const element of [layer, ...layer.querySelectorAll('*')]) {
      if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const box = element.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const style = getComputedStyle(element);
      const painted = PAINTED.has(element.tagName.toLowerCase()) ||
        [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim()) ||
        !/^(transparent|rgba\\(0, 0, 0, 0\\))$/.test(style.backgroundColor) || style.backgroundImage !== 'none' ||
        ['Top', 'Right', 'Bottom', 'Left'].some((side) => parseFloat(style['border' + side + 'Width']) > 0 && style['border' + side + 'Style'] !== 'none');
      if (painted) { shown.add(id); break; }
    }
  }
  return { outside: [...outside.values()], unloaded: [...unloaded.values()], shown: [...shown] };
})()`;
