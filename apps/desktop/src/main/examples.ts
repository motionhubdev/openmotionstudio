// Every click copies a bundled starting film into a fresh workspace project; existing films are never reused. A template
// is a folder of resources/templates/: its film.tsx and the files it plays (media/, with a licence beside each face and
// track, and voice/ for a narrated one), so it looks and sounds the same on every computer and in the video Home plays
// of it (scripts/render-templates.mjs).
import { cp, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Example, Project } from '../shared/api';
import { createInWorkspace, projectAt } from './project';

export const EXAMPLES: Example[] = [
  { id: 'kinetic', name: 'Kinetic type', line: 'Words on a beat, in one face at every weight.', seconds: 8 },
  { id: 'explainer', name: 'A narrated explainer', line: 'Three steps, a voice and captions lit word by word.', seconds: 10 },
  { id: 'data', name: 'A story in numbers', line: 'Real figures that count up and land, with their source on screen.', seconds: 9 },
  { id: 'music', name: 'Cut to the beat', line: 'Shapes and words that move on every beat of the track.', seconds: 8 },
];
/** The templates' folders, as the app ships them. */
export const TEMPLATES = join(__dirname, '..', '..', 'resources', 'templates');

export async function openExample(root: string, id: unknown): Promise<Project> {
  const example = EXAMPLES.find((e) => e.id === id);
  if (!example) throw new Error('Choose one of the starting points.');
  const project = await createInWorkspace(root, example.name);
  const template = join(TEMPLATES, example.id);
  // Entry by entry: the project's folder exists, with the Studio's own .motion-studio/ and .gitignore in it.
  for (const entry of await readdir(template)) await cp(join(template, entry), join(project.path, entry), { recursive: true, force: false, errorOnExist: true });
  return projectAt(project.path);
}
