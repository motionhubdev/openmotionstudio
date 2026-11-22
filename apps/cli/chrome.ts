// The headless Chrome oms draws films in: chrome-headless-shell at the build HyperFrames pins, taken from where HyperFrames
// or Puppeteer keep it or downloaded once into Puppeteer's shared cache, checked against the build's digests, and driven
// over the DevTools protocol on a pipe. The film's page is served by request interception from the same files and under
// the same policy as the Studio's oms-preview: scheme (serve.ts, ADR 0004), and nothing else reaches the network.

import { install, Browser, detectBrowserPlatform } from '@puppeteer/browsers';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { mkdir, rm, stat } from 'node:fs/promises';
import { homedir, release as osRelease } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { filmFile, filmPolicy } from '../desktop/src/main/film/serve';
import type { FilmInfo } from '../desktop/src/shared/preview';
import type { PhotoStage } from '../desktop/src/main/film/stage';

/**
 * The chrome-headless-shell build HyperFrames pins, so either tool can use the other's download: Chrome 158, or on macOS 12
 * and older (Darwin 21), which Chrome left after 150, the build HyperFrames pins there.
 */
export function chromeBuild(platform: NodeJS.Platform = process.platform, release = osRelease()): string {
  return platform === 'darwin' && Number.parseInt(release, 10) < 22 ? '150.0.7871.124' : '158.0.8127.36';
}

/**
 * The digests of each build, one per platform it has, as HyperFrames' `headlessShellDigest` computes them over an
 * unpacked install (heygen-com/hyperframes, Apache-2.0): a Chrome found on disk is used only when it is exactly one.
 */
const DIGESTS: Record<string, string[]> = {
  '158.0.8127.36': [
    '564ba9876826b3a3ce71f862a37c85ee7938191975afad9f427918db6b073e13',
    '32499804ce68213b7a3d5f622c8c94004522b02ed35bab7913495e6c8986c904',
    '2ba780aa9f4afc4f79f4d6c1b32eb0fb9c0217faaa88ac56b5c82facfb31742d',
    'ca7a3db192eb40cf690d8c338e5e15b62ebaaee4b02e0996521e22f6081c6db3',
    'dee5819f7bd47d82915bc0598a80288b7f09b9b3f819eef4008fdc208dc6f345',
  ],
  '150.0.7871.124': [
    '8c1c8a8f68f53b66b2ca340bcf0d6b3f50f9961b3042b759cefdecc7d2eacd4b',
    'fc5a7041fc62b0740093077cb476cae232853a0b4272c6851add5f60ce11d1c6',
  ],
};

/** Where the executable sits in an unpacked install, per platform and CPU; Chrome for Testing has no Linux on Arm. */
const EXECUTABLE: Record<string, [string, string]> = {
  'darwin/arm64': ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell'],
  'darwin/x64': ['chrome-headless-shell-mac-x64', 'chrome-headless-shell'],
  'linux/x64': ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
  'win32/ia32': ['chrome-headless-shell-win32', 'chrome-headless-shell.exe'],
  'win32/x64': ['chrome-headless-shell-win64', 'chrome-headless-shell.exe'],
};

/** Puppeteer's shared cache: HyperFrames looks here too, so what oms downloads it can use. */
const PUPPETEER_CACHE = join(homedir(), '.cache', 'puppeteer');
const hyperframesCache = () =>
  join(process.env.HYPERFRAMES_CACHE_DIR ? resolve(process.env.HYPERFRAMES_CACHE_DIR) : join(homedir(), '.cache', 'hyperframes'), 'chrome');

/** Files Chrome writes into its own folder while it runs, left out of the digest. */
const RUNNING_WRITES = ['debug.log', 'chrome_debug.log'];

function filesUnder(folder: string, prefix = ''): string[] | undefined {
  const names: string[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isFile()) names.push(name);
    else if (!entry.isDirectory()) return undefined; // a link could point anywhere
    else {
      const inner = filesUnder(join(folder, entry.name), `${name}/`);
      if (!inner) return undefined;
      names.push(...inner);
    }
  }
  return names;
}

/** sha256 over each file's path and sha256, in path order, as HyperFrames computes it; none for a folder holding a link. */
export function headlessShellDigest(folder: string): string | undefined {
  const names = filesUnder(folder)?.filter((name) => !RUNNING_WRITES.includes(name)).sort();
  if (!names) return undefined;
  const lines = names.map((name) => `${name}\0${createHash('sha256').update(readFileSync(join(folder, name))).digest('hex')}\n`);
  return createHash('sha256').update(lines.join('')).digest('hex');
}

/** Whether `binary` is a file in an install whose digest is one of `digests`. */
function pinned(binary: string, digests: string[]): boolean {
  try {
    if (!lstatSync(binary).isFile()) return false;
    const digest = headlessShellDigest(dirname(binary));
    return digest !== undefined && digests.includes(digest);
  } catch {
    return false;
  }
}

/** The `build` of chrome-headless-shell in a @puppeteer/browsers cache, when it is there and its digest one of `digests`. */
export function inCache(cacheDir: string, build: string, digests = DIGESTS[build] ?? [], platform = `${process.platform}/${process.arch}`): string | undefined {
  const executable = EXECUTABLE[platform];
  const base = join(cacheDir, 'chrome-headless-shell');
  if (!executable || !existsSync(base)) return undefined;
  const version = readdirSync(base).find((name) => name.slice(name.indexOf('-') + 1) === build);
  const binary = version && join(base, version, ...executable);
  return binary && pinned(binary, digests) ? binary : undefined;
}

/** Where a Linux distribution's package manager puts Chromium or Chrome. */
const SYSTEM_CHROMIUM = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];

/**
 * The system's Chromium, for Linux on Arm, which has no chrome-headless-shell: no digest can pin a distribution's
 * build, so only one root owns and no one else can change (as a package manager installs it), through every link.
 */
export function systemChromium(paths = SYSTEM_CHROMIUM): string | undefined {
  for (const path of paths) {
    try {
      const real = realpathSync(path);
      const owned = (file: string) => { const info = statSync(file); return info.uid === 0 && (info.mode & 0o022) === 0; };
      if (statSync(real).isFile() && owned(real) && owned(dirname(real))) return real;
    } catch {
      continue;
    }
  }
  return undefined;
}

/** Waits while another oms command downloads; a lock left by one that died is taken over after ten minutes. */
async function locked<T>(lock: string, work: () => Promise<T>): Promise<T> {
  await mkdir(dirname(lock), { recursive: true });
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    const since = await stat(lock).then((info) => Date.now() - info.mtimeMs, () => 0);
    if (since > 600_000) await rm(lock, { recursive: true, force: true });
    await new Promise((done) => setTimeout(done, 500));
  }
  try {
    return await work();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

/**
 * The Chrome to draw in: OMS_CHROME when set; on Linux on Arm, the system's Chromium; else the pinned build from
 * HyperFrames' cache or Puppeteer's, else that build downloaded into Puppeteer's cache once (about 100 MB), with its
 * progress on stderr.
 */
export async function findChrome(): Promise<string> {
  const named = process.env.OMS_CHROME;
  if (named) {
    if (!existsSync(named)) throw new Error(`OMS_CHROME names ${named}, which is not there.`);
    return named;
  }
  if (process.platform === 'linux' && process.arch === 'arm64') {
    const system = systemChromium();
    if (system) return system;
    throw new Error('Chrome has no headless build for Linux on Arm. Install Chromium with the system package manager (for example `sudo apt-get install chromium`), or name a Chrome in OMS_CHROME.');
  }
  const build = chromeBuild();
  const found = inCache(hyperframesCache(), build) ?? inCache(PUPPETEER_CACHE, build);
  if (found) return found;
  const platform = detectBrowserPlatform();
  if (!platform || !EXECUTABLE[`${process.platform}/${process.arch}`]) throw new Error(`No Chrome ${build} for ${process.platform} ${process.arch}.`);
  return locked(join(PUPPETEER_CACHE, 'oms-download.lock'), async () => {
    const again = inCache(PUPPETEER_CACHE, build);
    if (again) return again;
    console.error(`Downloading Chrome ${build} (about 100 MB) into ${PUPPETEER_CACHE}, once.`);
    const installed = await install({ browser: Browser.CHROMEHEADLESSSHELL, buildId: build, cacheDir: PUPPETEER_CACHE, platform });
    if (!pinned(installed.executablePath, DIGESTS[build] ?? [])) throw new Error(`The downloaded Chrome is not the build oms pins (${build}).`);
    return installed.executablePath;
  });
}

const NO_SANDBOX = ['--no-sandbox', '--disable-setuid-sandbox', '--no-zygote'];

/** What the sandbox decision reads of the host. */
export interface Host {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  uid: number | undefined;
  exists(path: string): boolean;
  read(path: string): string | undefined;
}

const thisHost = (): Host => ({
  platform: process.platform,
  env: process.env,
  uid: process.getuid?.(),
  exists: existsSync,
  read: (path) => { try { return readFileSync(path, 'utf8').trim(); } catch { return undefined; } },
});

/**
 * Whether to start Chrome's sandbox, as HyperFrames decides: OMS_CHROME_SANDBOX=1 or 0 when set; otherwise always but
 * on Linux as root, in a container, a serverless or orchestrated host, or where unprivileged user namespaces are off,
 * where it cannot start. Without it the film's code keeps its page's policy and interception, not the OS's isolation.
 */
export function sandboxWanted(host = thisHost()): boolean {
  const named = host.env.OMS_CHROME_SANDBOX;
  if (named === '0' || named === '1') return named === '1';
  if (host.platform !== 'linux') return true;
  return !(
    host.uid === 0 ||
    ['AWS_LAMBDA_FUNCTION_NAME', 'AWS_EXECUTION_ENV', 'K_SERVICE', 'CLOUD_RUN_JOB', 'KUBERNETES_SERVICE_HOST'].some((name) => host.env[name]) ||
    ['/.dockerenv', '/run/.containerenv'].some((path) => host.exists(path)) ||
    host.read('/proc/sys/kernel/apparmor_restrict_unprivileged_userns') === '1' ||
    host.read('/proc/sys/kernel/unprivileged_userns_clone') === '0'
  );
}

let warned = false;
function warnUnsandboxed(): void {
  if (warned) return;
  warned = true;
  console.error('oms: Chrome runs without its sandbox on this host; set OMS_CHROME_SANDBOX=1 to require it.');
}

type Message = { id?: number; method?: string; params?: Record<string, unknown>; sessionId?: string; result?: unknown; error?: { message: string } };

/** The DevTools protocol over Chrome's pipe: NUL-terminated JSON each way. */
export class Pipe {
  private next = 0;
  private readonly pending = new Map<number, { method: string; done: (value: never) => void; fail: (error: Error) => void }>();
  private readonly listeners = new Set<(message: Message) => void>();
  private chunks: Buffer[] = [];
  closed: Error | null = null;

  constructor(private readonly out: Writable, input: Readable) {
    input.on('data', (chunk: Buffer) => {
      let at = chunk.indexOf(0);
      while (at >= 0) {
        this.chunks.push(chunk.subarray(0, at));
        const message = JSON.parse(Buffer.concat(this.chunks).toString('utf8')) as Message;
        this.chunks = [];
        this.receive(message);
        chunk = chunk.subarray(at + 1);
        at = chunk.indexOf(0);
      }
      if (chunk.length) this.chunks.push(chunk);
    });
  }

  send<T>(method: string, params: Record<string, unknown> = {}, sessionId?: string): Promise<T> {
    if (this.closed) return Promise.reject(this.closed);
    const id = ++this.next;
    this.out.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
    return new Promise<T>((done, fail) => this.pending.set(id, { method, done: done as (value: never) => void, fail }));
  }

  on(listener: (message: Message) => void): void {
    this.listeners.add(listener);
  }

  close(error: Error): void {
    this.closed = error;
    for (const { fail } of this.pending.values()) fail(error);
    this.pending.clear();
  }

  private receive(message: Message): void {
    if (message.id === undefined) {
      for (const listener of this.listeners) listener(message);
      return;
    }
    const call = this.pending.get(message.id);
    if (!call) return;
    this.pending.delete(message.id);
    if (message.error) call.fail(new Error(`${call.method}: ${message.error.message}`));
    else call.done(message.result as never);
  }
}

/** Starts Chrome on a pipe; rejects with what it printed when it exits before it answers. */
async function start(binary: string, profile: string, sandbox: boolean): Promise<{ child: ChildProcess; pipe: Pipe }> {
  const args = [
    ...(basename(binary).startsWith('chrome-headless-shell') ? [] : ['--headless']),
    ...(sandbox ? [] : NO_SANDBOX),
    '--remote-debugging-pipe',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    '--force-device-scale-factor=1',
    // WebGL in software where there is no GPU, as the Studio does (stage.ts allowSoftwareWebGL).
    '--enable-unsafe-swiftshader',
    // Nothing leaves the machine: every name fails to resolve and every request not answered from the film goes to a
    // proxy that is not there.
    '--host-resolver-rules=MAP * ~NOTFOUND',
    '--proxy-server=127.0.0.1:9',
    '--proxy-bypass-list=<-loopback>',
    'about:blank',
  ];
  const child = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  let printed = '';
  child.stderr!.on('data', (data: Buffer) => { printed = (printed + data.toString()).slice(-4000); });
  const pipe = new Pipe(child.stdio[3] as Writable, child.stdio[4] as Readable);
  const exited = new Promise<never>((_, fail) =>
    child.once('exit', (code, signal) => {
      const error = new Error(`Chrome exited (${signal ?? code}) before it answered.\n${printed.trim()}`);
      pipe.close(error);
      fail(error);
    }),
  );
  child.once('error', (error) => pipe.close(error));
  await Promise.race([pipe.send('Browser.getVersion'), exited]);
  return { child, pipe };
}

const FRAME_MS = 60_000;
function timeout<T>(promise: Promise<T>, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<never>((_, fail) => { timer = setTimeout(() => fail(new Error(`${what} took longer than ${FRAME_MS / 1000} s.`)), FRAME_MS); }),
  ]).finally(() => clearTimeout(timer));
}

/** The film's origin: `.invalid` never resolves, so the page exists only as Chrome is answered from the film's files. */
const ORIGIN = 'https://film.invalid';

/**
 * Opens the film in `dir`, built into `output`, with the Studio's preview scripts from `studio`, in Chrome at `binary`
 * with its profile in `profile`. Rejects with the page's own error when it fails.
 */
export async function openChromeStage(binary: string, dir: string, output: string, studio: string, profile: string): Promise<PhotoStage> {
  let sandbox = sandboxWanted();
  let started: { child: ChildProcess; pipe: Pipe };
  try {
    started = await start(binary, profile, sandbox);
  } catch (error) {
    // The sandbox needs kernel features a host may not have; HyperFrames retries without it the same way.
    if (!sandbox || process.env.OMS_CHROME_SANDBOX === '1' || !/sandbox|namespace/i.test(String(error))) throw error;
    sandbox = false;
    started = await start(binary, profile, sandbox);
  }
  if (!sandbox) warnUnsandboxed();
  const { child, pipe } = started;
  const close = async () => {
    await pipe.send('Browser.close').catch(() => {});
    if (child.exitCode === null && child.signalCode === null) {
      const gone = new Promise((done) => child.once('exit', done));
      setTimeout(() => child.kill('SIGKILL'), 5000).unref();
      await gone;
    }
  };
  try {
    const { targetId } = await pipe.send<{ targetId: string }>('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await pipe.send<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true });
    // A window the film opens is closed as it appears: it would not be held to the film's files.
    await pipe.send('Target.setDiscoverTargets', { discover: true });
    pipe.on((message) => {
      const info = message.params?.targetInfo as { targetId: string; openerId?: string } | undefined;
      if (message.method === 'Target.targetCreated' && info?.openerId) void pipe.send('Target.closeTarget', { targetId: info.targetId }).catch(() => {});
    });
    // Every request the page makes is answered here: the film's files on its origin, nothing anywhere else.
    pipe.on((message) => {
      if (message.method !== 'Fetch.requestPaused' || message.sessionId !== sessionId) return;
      const { requestId, request } = message.params as { requestId: string; request: { url: string } };
      void (async () => {
        const url = new URL(request.url);
        if (url.origin !== ORIGIN) return pipe.send('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }, sessionId);
        const found = await filmFile(dir, output, studio, url.pathname);
        return pipe.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: found ? 200 : 404,
          responseHeaders: [
            { name: 'content-type', value: found?.type ?? 'text/plain' },
            { name: 'content-security-policy', value: filmPolicy(ORIGIN) },
            { name: 'cache-control', value: 'no-store' },
            { name: 'access-control-allow-origin', value: '*' },
          ],
          body: Buffer.from(found?.body ?? 'Not found').toString('base64'),
        }, sessionId);
      })().catch(() => pipe.send('Fetch.failRequest', { requestId, errorReason: 'Failed' }, sessionId).catch(() => {}));
    });
    await pipe.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, sessionId);

    const evaluate = async <T>(expression: string): Promise<T> => {
      const reply = await pipe.send<{ result: { value?: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
        'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
      return reply.result.value as T;
    };
    const failed = () => evaluate<string | null>('window.__omsError ?? null');

    await pipe.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, sessionId);
    await timeout(pipe.send('Page.navigate', { url: `${ORIGIN}/?render=1&v=1` }, sessionId), 'Loading the film');
    const film = await timeout(
      (async () => {
        for (;;) {
          const error = await failed();
          if (error) throw new Error(error);
          const info = await evaluate<FilmInfo | null>('window.__oms ? (({seek, ...film}) => film)(window.__oms) : null');
          if (info) return info;
          await new Promise((done) => setTimeout(done, 50));
        }
      })(),
      'Starting the film',
    );
    await pipe.send('Emulation.setDeviceMetricsOverride', { width: film.width, height: film.height, deviceScaleFactor: 1, mobile: false }, sessionId);
    await evaluate('document.fonts.ready.then(() => true)');
    return {
      film,
      async frame(t) {
        await timeout(evaluate(`window.__oms.seek(${Number(t)})`), `The frame at ${t.toFixed(2)} s`);
        await timeout(
          evaluate('Promise.all([...document.images].map(image => image.decode()).concat(document.fonts.ready)).then(() => true)'),
          'Loading image assets and faces',
        );
        const error = await failed();
        if (error) throw new Error(error);
        // DevTools' screenshot waits for a frame drawn from the page as it is now (stage.ts says why that matters).
        const shot = await timeout(
          pipe.send<{ data: string }>('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true }, sessionId),
          `Photographing the frame at ${t.toFixed(2)} s`,
        );
        const png = Buffer.from(shot.data, 'base64');
        return { toPNG: () => png };
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
