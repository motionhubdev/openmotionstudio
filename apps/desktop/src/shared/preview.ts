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
  | { type: 'oms:solo'; layer: string | null };

export type FromPreview =
  | { type: 'oms:ready'; film: FilmInfo }
  /** Where the picture is; from a still (?render=1) told where by its parent, with whether an image it shows is still loading. */
  | { type: 'oms:time'; t: number; playing: boolean; loading?: boolean }
  | { type: 'oms:error'; message: string }
  /** `levels` is how many elements, the innermost first, a pick at that point can step out through. */
  | { type: 'oms:picked'; element: PickedElement | null; box: Box | null; levels: number };

/**
 * The script that moves a render page to `t` and resolves, once its images are decoded and its faces loaded, with the
 * page's own error or null: one round trip a frame. A DevTools screenshot after it draws the page as it now is.
 */
export const seekScript = (t: number): string =>
  `window.__oms.seek(${Number(t)}).then(() => Promise.all([...document.images].map(image => image.decode()).concat(document.fonts.ready))).then(() => window.__omsError ?? null)`;

/** What a frame shows that a picture alone does not say: text past the frame's edge, and faces that never loaded. */
export interface Inspection {
  /** Visible text running past an edge of the frame, by layer: the first words of it, and which edges. */
  outside: { layer: string; text: string; edges: string[] }[];
  /**
   * Text that draws in a face the page never loaded, by layer: `family` is that face, the first in its stack not loaded
   * (a generic name when the stack falls to the machine's own), and `chars` the characters it draws, when the faces
   * loaded before it in the stack draw the rest (a Latin face before the one for Chinese), or empty when it draws all.
   */
  unloaded: { layer: string; family: string; chars: string }[];
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
  // pixel for pixel, when they lack it. (Widths do not tell: every face draws a Chinese character one em wide.)
  const covers = (style, faces, char) => {
    const key = style + '|' + faces + '|' + char;
    if (!drawn.has(key)) {
      const theirs = pixels(style + ' 40px ' + faces + ', monospace', char), fallback = pixels(style + ' 40px monospace', char);
      drawn.set(key, theirs.some((value, i) => value !== fallback[i]) || !fallback.some((value) => value));
    }
    return drawn.get(key);
  };
  const outside = new Map(), unloaded = new Map();
  for (const layer of document.querySelectorAll('[data-layer]')) {
    const id = layer.getAttribute('data-layer');
    const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.replace(/\\s+/g, ' ').trim();
      const element = node.parentElement;
      if (!text || !element || !element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
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
      if (first === 0) {
        if (!generic.has(bare(family))) unloaded.set(id + '|' + bare(family), { layer: id, family, chars: '' });
        continue;
      }
      const style = computed.fontStyle + ' ' + computed.fontWeight;
      const faces = stack.slice(0, first).join(', ');
      const missed = [...new Set(text.replace(/\\s/g, ''))].filter((char) => !covers(style, faces, char));
      if (!missed.length) continue;
      const seen = unloaded.get(id + '|' + bare(family));
      const chars = [...new Set((seen ? seen.chars : '') + missed.join(''))].slice(0, 12).join('');
      unloaded.set(id + '|' + bare(family), { layer: id, family, chars });
    }
  }
  return { outside: [...outside.values()], unloaded: [...unloaded.values()] };
})()`;
