import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chromeBuild, describePath, drawPath, drivable, headlessShellDigest, inCache, onGpu, Pipe, sandboxWanted, systemChromium, type Host } from '../chrome';

let scratch: string;
beforeEach(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'oms-chrome-'));
});
afterEach(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** A folder holding `files` (path → contents). */
async function folder(at: string, files: Record<string, string>): Promise<string> {
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(at, name, '..'), { recursive: true });
    await writeFile(join(at, name), body);
  }
  return at;
}

describe('onGpu', () => {
  it('draws on a hardware GPU, and on SwiftShader where Chrome made no context or a software one', () => {
    expect(onGpu(undefined, 'ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe(true);
    expect(onGpu(undefined, 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe(true);
    // No GPU, or one Chrome blocklists: it falls back to a software renderer itself.
    expect(onGpu(undefined, 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe(false);
    expect(onGpu(undefined, 'llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(false);
    expect(onGpu(undefined, 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe(false);
    expect(onGpu(undefined, null)).toBe(false);
  });

  it('follows OMS_RENDER_GPU over what Chrome found: 0 the CPU, 1 the GPU', () => {
    expect(onGpu('0', 'ANGLE (Intel, Intel(R) Arc(TM) Graphics Direct3D11, D3D11)')).toBe(false);
    expect(onGpu('1', 'SwiftShader')).toBe(true);
    expect(onGpu('1', null)).toBe(true);
  });
});

describe('drawPath', () => {
  const env = process.env.OMS_RENDER_GPU;
  afterEach(() => (env === undefined ? delete process.env.OMS_RENDER_GPU : (process.env.OMS_RENDER_GPU = env)));

  it('falls back to SwiftShader when Chrome cannot be asked, and keeps the answer for every stage after', async () => {
    delete process.env.OMS_RENDER_GPU;
    const missing = join(scratch, 'no-such-chrome');
    const first = await drawPath(missing);
    expect(first).toEqual({ gpu: false, renderer: 'SwiftShader' });
    process.env.OMS_RENDER_GPU = '1';
    expect(await drawPath(missing)).toBe(first);
    expect(describePath(first)).toBe('the CPU (SwiftShader)');
  });

  it('never starts Chrome to ask when OMS_RENDER_GPU=0', async () => {
    process.env.OMS_RENDER_GPU = '0';
    expect(await drawPath(join(scratch, 'forced-cpu'))).toEqual({ gpu: false, renderer: 'SwiftShader' });
  });
});

describe('chromeBuild', () => {
  it('pins the build HyperFrames pins, and its older one on macOS 12 and before', () => {
    expect(chromeBuild('linux', '6.8.0')).toBe('158.0.8127.36');
    expect(chromeBuild('win32', '10.0.22631')).toBe('158.0.8127.36');
    expect(chromeBuild('darwin', '22.1.0')).toBe('158.0.8127.36');
    expect(chromeBuild('darwin', '21.6.0')).toBe('150.0.7871.124');
  });
});

describe('drivable', () => {
  it('draws frames on demand only in chrome-headless-shell on Linux', () => {
    expect(drivable('/c/chrome-headless-shell-linux64/chrome-headless-shell', 'linux')).toBe(true);
    expect(drivable('/c/chrome-headless-shell-mac-arm64/chrome-headless-shell', 'darwin')).toBe(false);
    expect(drivable('/usr/bin/chromium', 'linux')).toBe(false);
  });
});

describe('headlessShellDigest', () => {
  it('hashes each file by its path, as HyperFrames does, so either can verify the other\'s download', async () => {
    const at = await folder(join(scratch, 'shell'), { 'a.txt': 'alpha', 'sub/b.bin': 'beta' });
    expect(headlessShellDigest(at)).toBe('e4b11b9759c246ca757c43bb5b4b51dc5cde10b72a8e08524eb9ac11cbcb23a4');
  });

  it('leaves out the logs Chrome writes while it runs, and nothing else', async () => {
    const at = await folder(join(scratch, 'shell'), { 'a.txt': 'alpha', 'sub/b.bin': 'beta', 'debug.log': 'noise' });
    expect(headlessShellDigest(at)).toBe('e4b11b9759c246ca757c43bb5b4b51dc5cde10b72a8e08524eb9ac11cbcb23a4');
    await writeFile(join(at, 'sub/b.bin'), 'changed');
    expect(headlessShellDigest(at)).not.toBe('e4b11b9759c246ca757c43bb5b4b51dc5cde10b72a8e08524eb9ac11cbcb23a4');
  });

  it('refuses a folder holding a link, which could point anywhere', async () => {
    const at = await folder(join(scratch, 'shell'), { 'a.txt': 'alpha' });
    await symlink(join(at, 'a.txt'), join(at, 'b.txt'));
    expect(headlessShellDigest(at)).toBeUndefined();
  });
});

describe('inCache', () => {
  const build = '158.0.8127.36';
  const install = (cache: string, version: string) =>
    folder(join(cache, 'chrome-headless-shell', version, 'chrome-headless-shell-linux64'), { 'chrome-headless-shell': 'binary', 'lib.so': 'library' });

  it('finds the pinned build when its digest is one it accepts', async () => {
    const shell = await install(scratch, `linux-${build}`);
    const digest = headlessShellDigest(shell)!;
    expect(inCache(scratch, build, [digest], 'linux/x64')).toBe(join(shell, 'chrome-headless-shell'));
  });

  it('runs no Chrome whose files are not exactly the pinned build', async () => {
    const shell = await install(scratch, `linux-${build}`);
    const digest = headlessShellDigest(shell)!;
    await writeFile(join(shell, 'lib.so'), 'tampered');
    expect(inCache(scratch, build, [digest], 'linux/x64')).toBeUndefined();
  });

  it('takes no other build, and nothing on a platform with no headless shell', async () => {
    const shell = await install(scratch, 'linux-157.0.0.0');
    expect(inCache(scratch, build, [headlessShellDigest(shell)!], 'linux/x64')).toBeUndefined();
    const pinnedShell = await install(scratch, `linux-${build}`);
    expect(inCache(scratch, build, [headlessShellDigest(pinnedShell)!], 'linux/arm64')).toBeUndefined();
    expect(inCache(join(scratch, 'none'), build, [], 'linux/x64')).toBeUndefined();
  });
});

describe('systemChromium', () => {
  it('takes no Chromium another user than root could have changed', async () => {
    const own = await folder(join(scratch, 'bin'), { chromium: 'binary' });
    // The test does not run as root's file: a file it wrote is not root's, unless the suite runs as root.
    const expected = process.getuid?.() === 0 ? join(own, 'chromium') : undefined;
    expect(systemChromium([join(scratch, 'missing'), join(own, 'chromium')])).toBe(expected);
  });
});

describe('sandboxWanted', () => {
  const host = (over: Partial<Host> = {}): Host => ({ platform: 'linux', env: {}, uid: 1000, exists: () => false, read: () => undefined, ...over });

  it('starts the sandbox where it can', () => {
    expect(sandboxWanted(host())).toBe(true);
    expect(sandboxWanted(host({ platform: 'darwin', uid: 0 }))).toBe(true);
    expect(sandboxWanted(host({ platform: 'win32', uid: undefined }))).toBe(true);
  });

  it('does not where Chrome cannot start it on Linux: root, containers, serverless hosts, no user namespaces', () => {
    expect(sandboxWanted(host({ uid: 0 }))).toBe(false);
    expect(sandboxWanted(host({ exists: (path) => path === '/.dockerenv' }))).toBe(false);
    expect(sandboxWanted(host({ env: { KUBERNETES_SERVICE_HOST: '10.0.0.1' } }))).toBe(false);
    expect(sandboxWanted(host({ read: (path) => (path.endsWith('unprivileged_userns_clone') ? '0' : undefined) }))).toBe(false);
  });

  it('obeys OMS_CHROME_SANDBOX either way', () => {
    expect(sandboxWanted(host({ uid: 0, env: { OMS_CHROME_SANDBOX: '1' } }))).toBe(true);
    expect(sandboxWanted(host({ env: { OMS_CHROME_SANDBOX: '0' } }))).toBe(false);
  });
});

describe('Pipe', () => {
  /** A pipe and Chrome's side of it: what oms wrote, and a way to answer. */
  function connect() {
    const toChrome = new PassThrough();
    const fromChrome = new PassThrough();
    const pipe = new Pipe(toChrome, fromChrome);
    const sent: { id: number; method: string; sessionId?: string }[] = [];
    toChrome.on('data', (chunk: Buffer) => {
      for (const part of chunk.toString().split('\0')) if (part) sent.push(JSON.parse(part));
    });
    return { pipe, sent, answer: (data: string) => fromChrome.write(data) };
  }

  it('sends NUL-terminated calls and matches each answer to its call, however Chrome splits them', async () => {
    const { pipe, sent, answer } = connect();
    const first = pipe.send<{ v: number }>('A.one');
    const second = pipe.send<{ v: number }>('A.two', {}, 'session');
    await new Promise((done) => setImmediate(done));
    expect(sent.map((call) => [call.method, call.sessionId])).toEqual([['A.one', undefined], ['A.two', 'session']]);
    const both = `${JSON.stringify({ id: sent[1]!.id, result: { v: 2 } })}\0${JSON.stringify({ id: sent[0]!.id, result: { v: 1 } })}\0`;
    answer(both.slice(0, 7));
    answer(both.slice(7));
    expect(await first).toEqual({ v: 1 });
    expect(await second).toEqual({ v: 2 });
  });

  it('hands events to its listeners and rejects a call Chrome refuses', async () => {
    const { pipe, sent, answer } = connect();
    const events: string[] = [];
    pipe.on((message) => events.push(message.method!));
    const call = pipe.send('A.fail');
    await new Promise((done) => setImmediate(done));
    answer(`${JSON.stringify({ method: 'Page.loaded', params: {} })}\0${JSON.stringify({ id: sent[0]!.id, error: { message: 'no' } })}\0`);
    await expect(call).rejects.toThrow('A.fail: no');
    expect(events).toEqual(['Page.loaded']);
  });

  it('rejects what is pending, and what is sent after, once Chrome is gone', async () => {
    const { pipe } = connect();
    const pending = pipe.send('A.wait');
    pipe.close(new Error('Chrome exited'));
    await expect(pending).rejects.toThrow('Chrome exited');
    await expect(pipe.send('A.late')).rejects.toThrow('Chrome exited');
  });
});
