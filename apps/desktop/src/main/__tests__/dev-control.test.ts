import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DevControl, startDevControl } from '../dev-control';

let dir: string;
let control: DevControl | null = null;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'oms-dev-control-'));
});
afterEach(async () => {
  control?.close();
  control = null;
  await rm(dir, { recursive: true, force: true });
});

/** A POST to `url`, with `headers`; its status and its JSON body, if any. */
function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: unknown }> {
  return new Promise((done, fail) => {
    const sent = request(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers } }, (response) => {
      let text = '';
      response.on('data', (chunk) => (text += chunk));
      response.on('end', () => done({ status: response.statusCode ?? 0, body: text ? JSON.parse(text) : null }));
    });
    sent.on('error', fail);
    sent.end(JSON.stringify(body));
  });
}

describe('the dev control server', () => {
  it('writes its URL, with its secret, to the file, answers calls there, and removes the file when it ends', async () => {
    const run = vi.fn(async (call: string, input: Record<string, unknown>) => ({ call, input }));
    const file = join(dir, 'dev-control.json');
    control = await startDevControl(file, run);
    const written = JSON.parse(await readFile(file, 'utf8')) as { url: string; pid: number };
    expect(written).toEqual({ url: control.url, pid: process.pid });
    expect(control.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/control\/[0-9a-f-]{36}$/);
    expect(await post(control.url, { call: 'status', input: { project: '/p' } })).toEqual({ status: 200, body: { ok: true, result: { call: 'status', input: { project: '/p' } } } });
    control.close();
    control = null;
    expect(existsSync(file)).toBe(false);
  });

  it('refuses a request without its secret, and one from a web page', async () => {
    const run = vi.fn(async () => 'ran');
    control = await startDevControl(join(dir, 'dev-control.json'), run);
    const elsewhere = control.url.replace(/control\/.*$/, 'control/guess');
    expect((await post(elsewhere, { call: 'status' })).status).toBe(404);
    expect((await post(control.url, { call: 'status' }, { origin: 'https://example.com' })).status).toBe(404);
    expect(run).not.toHaveBeenCalled();
  });

  it("says a call's failure, and refuses what is not a call", async () => {
    control = await startDevControl(join(dir, 'dev-control.json'), async () => {
      throw new Error('That project is not in your library.');
    });
    expect((await post(control.url, { call: 'say' })).body).toEqual({ ok: false, error: 'That project is not in your library.' });
    expect(await post(control.url, { input: {} })).toEqual({ status: 400, body: { ok: false, error: 'Name a call.' } });
  });
});
