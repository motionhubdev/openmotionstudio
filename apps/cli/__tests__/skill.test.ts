import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

const at = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

// `npx skills add` copies skills/oms from the repository as it is, so the film format the skill reads is committed there,
// and must be the Studio's own (build-cli.mjs writes it).
it("carries the Studio's film format whole, as the Studio's agent has it", async () => {
  const guide = await at('../../desktop/src/main/film/film.md');
  const format = guide.slice(guide.indexOf('# The film'), guide.indexOf('# How you work'));
  expect(guide.indexOf('# The film')).toBeGreaterThanOrEqual(0);
  expect(guide.indexOf('# How you work')).toBeGreaterThan(guide.indexOf('# The film'));
  expect(await at('../skills/oms/film-format.md'), 'Run node apps/desktop/scripts/build-cli.mjs to write the skill film-format.md again').toBe(format);
});

it('names only files the skill holds', async () => {
  const skill = await at('../skills/oms/SKILL.md');
  const linked = [...skill.matchAll(/\]\(((?!https?:)[^)#]+)\)/g)].map((match) => match[1]!);
  expect(linked).toContain('film-format.md');
  for (const path of linked) await expect(at(`../skills/oms/${path}`), path).resolves.toBeTypeOf('string');
});
