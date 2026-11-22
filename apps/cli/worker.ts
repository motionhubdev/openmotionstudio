// This Electron main process opens one film in the Studio's sandboxed offscreen player.
import { app, session } from 'electron';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildFilmOnce } from '../desktop/src/main/film/film';
import { registerPreviewScheme, servePreview } from '../desktop/src/main/film/preview';
import { openStage } from '../desktop/src/main/film/stage';
import { reviewBuild } from '../desktop/src/main/film/review';
import { soundFile } from '../desktop/src/main/film/mix';

function args(): [string, string, string, string] {
  const [command, dir, scratch, at] = process.argv.slice(-4);
  if (command && dir && scratch && at) return [command, dir, scratch, at];
  console.error('The preview player was started without its command, folder, scratch folder and time.');
  process.exit(2);
}
const [command, dir, scratch, at] = args();
app.setPath('userData', scratch);
// Electron takes this script's own path for the app's; the Studio's preview scripts are beside it.
// setAppPath is Electron's, though its types leave it out.
(app as typeof app & { setAppPath(path: string): void }).setAppPath(__dirname);
app.on('window-all-closed', () => {});
registerPreviewScheme();

async function run() {
  await app.whenReady();
  const output = join(scratch, 'build');
  const preview = session.fromPartition('oms-cli');
  preview.setPermissionRequestHandler((_contents, _permission, answer) => answer(false));
  servePreview(preview, () => dir, output);
  const build = await buildFilmOnce(dir, output);
  const open = (version: number) => openStage(version, preview);
  if (command === 'check') {
    const review = await reviewBuild(build, open);
    for (const sound of review.film?.sounds ?? []) {
      try {
        await soundFile(dir, sound.src, output);
      } catch (error) {
        review.issues.push({ id: 'sound-' + sound.src, kind: 'export', severity: 'error', text: String(error) });
      }
    }
    await writeFile(join(scratch, 'review.json'), JSON.stringify(review));
    return;
  }
  if (!build.ok) throw new Error(build.errors.join('\n'));
  const stage = await open(build.version);
  try {
    const seconds = Number(at);
    if (!(seconds >= 0 && seconds < stage.film.seconds)) throw new Error(`Time must be in [0, ${stage.film.seconds}) seconds.`);
    await writeFile(join(scratch, 'frame.png'), (await stage.frame(seconds)).toPNG());
  } finally {
    stage.close();
  }
}

run().then(() => app.exit(0), error => { console.error(error.message); app.exit(1); });
