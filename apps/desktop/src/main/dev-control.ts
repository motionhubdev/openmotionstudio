// A dev build's control server (ADR 0023): a script or an outside agent drives the Studio through it, to make an
// example film or test one, without operating its window. On 127.0.0.1 at a random port, answering only at a path with
// a random secret in it and refusing a request that carries an Origin, as the agent's MCP server does (studio-mcp.ts).
// Its URL is written to a file in the app's user data that only the person can read. A released Studio neither starts
// it nor carries it: index.ts imports it only under import.meta.env.OMS_DEV_CONTROL (electron.vite.config.mts).

import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

/** The largest request the server reads. */
const MAX_BODY = 1024 * 1024;

/** Runs one call, by name, with what it was given; what it gives back is the answer. */
export type ControlCall = (call: string, input: Record<string, unknown>) => Promise<unknown>;

/** A running control server: its URL, and how to end it (which removes its file, at once, as the app quits). */
export interface DevControl {
  url: string;
  close(): void;
}

const read = (request: IncomingMessage) =>
  new Promise<string>((done, fail) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        fail(new Error('Too large.'));
        request.destroy();
      }
    });
    request.on('end', () => done(body));
    request.on('error', fail);
  });

/**
 * Starts the server and writes `{ url, pid }` to `file`. A request is a POST of `{ "call": name, "input": {…} }` to the
 * URL; the answer is `{ "ok": true, "result": … }` or `{ "ok": false, "error": "…" }`.
 */
export async function startDevControl(file: string, run: ControlCall): Promise<DevControl> {
  const path = `/control/${randomUUID()}`;
  const send = (response: ServerResponse, status: number, body?: object) => {
    response.writeHead(status, body ? { 'content-type': 'application/json' } : {});
    response.end(body ? JSON.stringify(body) : undefined);
  };
  const server = createServer((request, response) => {
    if (request.url !== path || request.headers.origin) return send(response, 404);
    if (request.method !== 'POST') return send(response, 405);
    read(request).then(
      async (body) => {
        let given: { call?: unknown; input?: unknown };
        try {
          given = JSON.parse(body);
        } catch {
          return send(response, 400, { ok: false, error: 'Not JSON.' });
        }
        if (typeof given.call !== 'string') return send(response, 400, { ok: false, error: 'Name a call.' });
        const input = given.input && typeof given.input === 'object' ? (given.input as Record<string, unknown>) : {};
        try {
          send(response, 200, { ok: true, result: (await run(given.call, input)) ?? null });
        } catch (error) {
          send(response, 200, { ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      },
      () => send(response, 413),
    );
  });
  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', done);
  });
  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}${path}`;
  await writeFile(file, JSON.stringify({ url, pid: process.pid }), { mode: 0o600 });
  return {
    url,
    close() {
      server.close();
      rmSync(file, { force: true });
    },
  };
}
