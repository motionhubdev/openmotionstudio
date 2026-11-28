import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({}));
const logged = vi.hoisted(() => [] as unknown[][]);
vi.mock('../log', () => ({ log: (...args: unknown[]) => logged.push(args) }));

import { POSTHOG, Statistics, type StatisticsHost, tokenBand } from '../statistics';

function host(over: Partial<StatisticsHost> = {}) {
  const sent: { url: string; body: Record<string, any> }[] = [];
  const h: StatisticsHost = {
    enabled: async () => true,
    id: async () => 'install-id',
    send: async (url, init) => {
      sent.push({ url, body: JSON.parse(init.body) });
      return { ok: true, status: 200 };
    },
    version: '0.2.0',
    platform: 'darwin',
    arch: 'arm64',
    locale: () => 'zh-CN',
    ...over,
  };
  return { h, sent };
}

describe('usage statistics', () => {
  it('sends nothing, and makes no id, while the person does not share them', async () => {
    const id = vi.fn(async () => 'install-id');
    const { h, sent } = host({ enabled: async () => false, id });
    await new Statistics(h).count({ event: 'app_started' });
    expect(sent).toEqual([]);
    expect(id).not.toHaveBeenCalled();
  });

  it('sends one event to PostHog under the install id, with no profile of a person', async () => {
    const { h, sent } = host();
    await new Statistics(h).count({ event: 'project_opened', how: 'create' });
    expect(sent).toHaveLength(1);
    const [first] = sent as [(typeof sent)[number]];
    expect(first.url).toBe(POSTHOG);
    expect(first.body).toMatchObject({ event: 'project_opened', distinct_id: 'install-id' });
    expect(first.body.properties).toEqual({
      how: 'create', product: 'studio-app', app_version: '0.2.0', $os: 'Mac OS X', arch: 'arm64', locale: 'zh-CN',
      $lib: 'openmotionstudio', $process_person_profile: false,
    });
  });

  it('sends a turn by its kind, outcome, model and rounded sizes, never a path or anything it was not given', async () => {
    const { h, sent } = host();
    const statistics = new Statistics(h);
    const turn = { event: 'agent_turn', agent: 'built-in', outcome: 'done', seconds: 12.6, tools: 3, tokens: 45_678 } as const;
    await statistics.count({ ...turn, model: 'deepseek/deepseek-chat' });
    await statistics.count({ ...turn, model: '/Users/ana/models/llama.gguf' });
    await statistics.count({ ...turn, model: 'C:\\models\\llama.gguf' });
    await statistics.count({ event: 'motion_added', motion: '@ana/red-pencil' });
    await statistics.count({ event: 'motion_added', motion: 'my-own-motion folder' });
    await statistics.count({ ...turn, prompt: 'make a film about my secret plan', key: 'sk-ant-secret' } as never);
    const props = sent.map((s) => s.body.properties);
    expect(props[0]).toMatchObject({ agent: 'built-in', outcome: 'done', model: 'deepseek/deepseek-chat', seconds: 13, tools: 3, tokens: 10_000 });
    expect(props[1].model).toBeUndefined();
    expect(props[2].model).toBeUndefined();
    expect(props[3].motion).toBe('@ana/red-pencil');
    expect(props[4].motion).toBeUndefined();
    const all = JSON.stringify(sent);
    for (const never of ['Users', 'models', 'my-own', 'secret', 'sk-ant', 'prompt']) expect(all).not.toContain(never);
  });

  it('logs a refused or failed send and never throws', async () => {
    logged.length = 0;
    await new Statistics(host({ send: async () => ({ ok: false, status: 400 }) }).h).count({ event: 'app_started' });
    await new Statistics(host({ send: async () => { throw new Error('offline'); } }).h).count({ event: 'export_failed' });
    expect(logged).toEqual([
      ['statistics.refused', { event: 'app_started', status: 400 }],
      ['statistics.failed', { event: 'export_failed', error: 'offline' }],
    ]);
  });

  it('counts tokens only by their order of magnitude', () => {
    expect([0, 999, 1000, 9_999, 10_000, 2_345_678].map(tokenBand)).toEqual([0, 0, 1000, 1000, 10_000, 1_000_000]);
  });
});
