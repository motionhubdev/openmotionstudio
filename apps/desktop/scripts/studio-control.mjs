// Drives a dev build of the Studio (`pnpm dev`) from a terminal, through its control server (ADR 0023): for making an
// example film or testing one without operating its window. Not part of oms.
//
//   node apps/desktop/scripts/studio-control.mjs <call> [--name value ...] [--user-data <folder>]
//
//   status                                      the library, open projects, tasks, builds and export progress
//   new     --brief "<words>" [--agent claude]  a project from a brief, sent to the agent (claude, codex or built-in)
//   say     --project <folder> --text "<notes>" a turn of notes to the project's agent
//   wait    --project <folder> [--since <ms>] [--timeout <s>]
//                                               until the turn begun since then ends: its outcome, reply and usage
//   voice   --project <folder>                  the film's lines spoken in its voice
//   export  --project <folder> --file <new.mp4> an MP4, no save dialog
//   pack    --project <folder> --file <new.oms> a film file, no save dialog
//
// new and say print the `since` to give wait. The URL and its secret are read from dev-control.json in the Studio's user
// data (--user-data, or OMS_USER_DATA, else where a dev build keeps it).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const [call, ...rest] = process.argv.slice(2);
if (!call) throw new Error('usage: node studio-control.mjs <status|new|say|wait|voice|export|pack> [--name value ...]');
const input = {};
let userData = process.env.OMS_USER_DATA;
for (let i = 0; i < rest.length; i += 2) {
  const name = rest[i]?.replace(/^--/, '');
  const value = rest[i + 1];
  if (!name || value === undefined) throw new Error(`Give --${name ?? 'name'} a value.`);
  if (name === 'user-data') userData = value;
  else input[name] = name === 'since' || name === 'timeout' ? Number(value) : name === 'project' || name === 'file' ? resolve(value) : value;
}
const appData = process.env.APPDATA ?? (process.platform === 'darwin' ? join(homedir(), 'Library', 'Application Support') : process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'));
const file = join(userData ?? join(appData, 'OpenMotionStudio'), 'dev-control.json');
let url;
try {
  ({ url } = JSON.parse(readFileSync(file, 'utf8')));
} catch {
  throw new Error(`No ${file}: start the Studio with \`pnpm dev\` (OMS_STUDIO_CONTROL=0 turns its control off).`);
}
const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ call, input }) });
const answer = await response.json().catch(() => ({ ok: false, error: `The Studio answered ${response.status}.` }));
if (!answer.ok) {
  console.error(answer.error);
  process.exit(1);
}
console.log(JSON.stringify(answer.result, null, 2));
