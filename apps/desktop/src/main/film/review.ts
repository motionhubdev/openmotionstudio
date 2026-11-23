import type { BuildResult, FilmReview } from '../../shared/api';
import type { PhotoStage } from './stage';

/** Checks a fixed bundle. Sampling catches rendering failures, not every possible visual defect. */
export async function reviewBuild(
  build: BuildResult | null,
  open: (version: number) => Promise<PhotoStage>,
  signal?: AbortSignal,
): Promise<FilmReview> {
  const review: FilmReview = { version: build?.version ?? 0, checkedFrames: 0, issues: [] };
  if (!build?.ok) {
    review.issues = (build?.errors.length ? build.errors : ['The film is not ready yet.']).map((text, i) => ({
      id: `build-${i}`,
      kind: 'build',
      severity: 'error',
      text,
    }));
    return review;
  }
  let stage: PhotoStage | undefined;
  try {
    signal?.throwIfAborted();
    stage = await open(build.version);
    const film = stage.film;
    review.film = film;
    if (!Number.isInteger(film.width) || !Number.isInteger(film.height) || film.width % 2 || film.height % 2)
      review.issues.push({
        id: 'export-size',
        kind: 'export',
        severity: 'error',
        text: 'MP4 needs even, whole-pixel width and height. Ask the agent to adjust the film size.',
      });
    for (const scene of film.scenes)
      for (const layer of scene.layers) {
        if (layer.x < 0 || layer.y < 0 || layer.x + layer.w > film.width || layer.y + layer.h > film.height)
          review.issues.push({
            id: `bounds-${scene.id}-${layer.id}`,
            kind: 'layout',
            severity: 'warning',
            text: `Layer “${layer.id}” extends beyond the frame. This may be intentional.`,
            time: scene.start + scene.duration / 2,
            scene: scene.id,
          });
      }
    // The start, each scene's middle, 85 % of the way through each line (where what it names has appeared), the end.
    const lineTimes = film.scenes.flatMap((s) => s.lines.map((line) => line.start + 0.85 * (line.end - line.start)));
    const times = [...new Set([0, ...film.scenes.map((s) => s.start + s.duration / 2), ...lineTimes, Math.max(0, film.seconds - 1 / film.fps)])]
      .filter((time) => time >= 0 && time < film.seconds)
      .sort((a, b) => a - b);
    /** In a face's characters: a whole text set in it. */
    const WHOLE = '';
    const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong']);
    const sceneAt = (time: number) => film.scenes.find((s) => time >= s.start && time < s.start + s.duration)?.id;
    const said = new Set<string>();
    // Each face text falls to, gathered over every frame drawn: by layer, the characters it draws ('' for whole texts).
    const faces = new Map<string, { family: string; layers: Map<string, Set<string>>; time: number }>();
    for (const time of times) {
      signal?.throwIfAborted();
      try {
        await stage.png(time);
        review.checkedFrames++;
        const seen = await stage.inspect();
        // One warning a layer, at the first frame it shows in: its first words, and every edge any of its text crosses.
        for (const layer of new Set(seen.outside.map((o) => o.layer))) {
          if (said.has(`outside|${layer}`)) continue;
          said.add(`outside|${layer}`);
          const texts = seen.outside.filter((o) => o.layer === layer);
          const edges = [...new Set(texts.flatMap((o) => o.edges))];
          const more = texts.length > 1 ? ` and ${texts.length - 1} more` : '';
          review.issues.push({
            id: `outside-${layer}`,
            kind: 'layout',
            severity: 'warning',
            text: `Text in layer “${layer}” (“${texts[0]!.text}”${more}) runs past the frame's ${edges.join(' and ')} edge at ${time.toFixed(2)} s. A component's coordinates are its layer's, not the frame's.`,
            time,
            scene: sceneAt(time),
          });
        }
        for (const { layer, family, chars } of seen.unloaded) {
          const key = family.toLowerCase();
          const face = faces.get(key) ?? { family, layers: new Map<string, Set<string>>(), time };
          faces.set(key, face);
          const drawn = face.layers.get(layer) ?? new Set<string>();
          face.layers.set(layer, drawn);
          if (!chars) drawn.add(WHOLE);
          for (const char of chars) drawn.add(char);
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        review.issues.push({
          id: 'drawing',
          kind: 'runtime',
          severity: 'error',
          text: error instanceof Error ? error.message : String(error),
          time,
          scene: film.scenes.find((s) => time >= s.start && time < s.start + s.duration)?.id,
        });
        break;
      }
    }
    // One warning a face, at the first frame it was seen in, naming every layer and every character that falls to it.
    for (const [key, { family, layers, time }] of faces) {
      const where = GENERIC.has(key) ? `this machine's own ${family} face` : `“${family}”, which neither the film nor its motion loads, so to this machine's fallback`;
      const place = (layer: string) => (layer === 'captions' ? 'the captions' : `layer “${layer}”`);
      const lacking = [...layers].filter(([, drawn]) => [...drawn].some((char) => char !== WHOLE)).map(([layer, drawn]) => {
        const chars = [...drawn].filter((char) => char !== WHOLE);
        return `${place(layer)} (“${chars.slice(0, 40).join('')}”${chars.length > 40 ? ` and ${chars.length - 40} more` : ''})`;
      });
      const whole = [...layers].filter(([, drawn]) => drawn.has(WHOLE)).map(([layer]) => place(layer));
      const said = [
        ...(lacking.length ? [`Characters the faces it loads lack fall to ${where}: ${lacking.join(', ')}.`] : []),
        ...(whole.length ? [`${whole.join(', ').replace(/^./, (c) => c.toUpperCase())} ${whole.length > 1 || whole[0] === 'the captions' ? 'set' : 'sets'} text in ${where}.`] : []),
      ];
      review.issues.push({
        id: `face-${key}`,
        kind: 'layout',
        severity: 'warning',
        text: `${said.join(' ')} Frames differ between machines. Declare a face that has them from the project's files, or use one the motion ships.`,
        time,
        scene: sceneAt(time),
      });
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    review.issues.push({ id: 'preview', kind: 'runtime', severity: 'error', text: error instanceof Error ? error.message : String(error) });
  } finally {
    await stage?.close();
  }
  return review;
}
