// Anonymous usage statistics (ADR 0025): which of the Studio's features are used, counted in PostHog. On unless the
// person turns "Share anonymous usage statistics" off in Settings, and only in a packaged build. Each event is one of the
// shapes below and carries nothing else: never a path, a file's or a project's name, a brief, a prompt, a model's reply
// or a key. The person is a random id kept in settings.json, tied to nothing; PostHog keeps no profile of it and drops
// the address it came from. Sent from the main process alone, one request an event, and a failure is logged, never retried.

import type { AgentKind } from '../shared/api';
import { log } from './log';

/** Everything the Studio counts. */
export type StatisticsEvent =
  | { event: 'app_started' }
  | { event: 'project_opened'; how: 'open' | 'create' | 'recent' | 'example' }
  | { event: 'motion_added'; motion: string }
  | {
      event: 'agent_turn';
      agent: AgentKind;
      outcome: 'done' | 'failed' | 'stopped';
      model?: string;
      seconds: number;
      tools: number;
      tokens: number;
    }
  | { event: 'export_finished'; seconds: number }
  | { event: 'export_failed' }
  | { event: 'export_cancelled' };

export const POSTHOG = 'https://us.i.posthog.com/i/v0/e/';
const TOKEN = 'phc_B5dnhVbykZ48YL9YVCdcZcjSL7ASXL6qXT6heLduLKDG';

// A motion is counted by its hub id (@scope/slug), which is public. A model by its id, `name` or `org/name` alone: a
// local model's id can be a file's path, which is never sent.
const MOTION = /^@[a-z0-9-]{1,64}\/[a-z0-9-]{1,64}$/;
const MODEL = /^\w[\w.:@-]{0,79}(\/\w[\w.:@-]{0,79})?$/;

/** How many tokens a turn took, as an order of magnitude: 0, 1k, 10k, 100k, 1M… so no count is exact. */
export const tokenBand = (n: number): number => (n < 1000 ? 0 : 10 ** Math.floor(Math.log10(n)));

/** The properties an event is sent with, from the event's own fields alone; anything that does not fit is left out. */
export function properties(e: StatisticsEvent): Record<string, string | number> {
  switch (e.event) {
    case 'app_started':
    case 'export_failed':
    case 'export_cancelled':
      return {};
    case 'project_opened':
      return { how: e.how };
    case 'motion_added':
      return MOTION.test(e.motion) ? { motion: e.motion } : {};
    case 'agent_turn':
      return {
        agent: e.agent,
        outcome: e.outcome,
        ...(e.model && MODEL.test(e.model) ? { model: e.model } : {}),
        seconds: Math.round(e.seconds),
        tools: e.tools,
        tokens: tokenBand(e.tokens),
      };
    case 'export_finished':
      return { seconds: Math.round(e.seconds) };
  }
}

export interface StatisticsHost {
  /** Whether the person shares statistics: their preference, on unless they turned it off. */
  enabled(): Promise<boolean>;
  /** The install's random id, made on first use. */
  id(): Promise<string>;
  send(url: string, init: { method: 'POST'; headers: Record<string, string>; body: string }): Promise<{ ok: boolean; status: number }>;
  version: string;
  platform: NodeJS.Platform;
  arch: string;
  locale(): string;
}

export class Statistics {
  constructor(private readonly host: StatisticsHost) {}

  /** Counts an event if the person shares statistics; resolves once it is sent or left, and never throws. */
  async count(e: StatisticsEvent): Promise<void> {
    try {
      if (!(await this.host.enabled())) return;
      const body = JSON.stringify({
        api_key: TOKEN,
        event: e.event,
        distinct_id: await this.host.id(),
        timestamp: new Date().toISOString(),
        properties: {
          ...properties(e),
          product: 'studio-app',
          app_version: this.host.version,
          $os: ({ darwin: 'Mac OS X', win32: 'Windows', linux: 'Linux' } as Record<string, string>)[this.host.platform] ?? this.host.platform,
          arch: this.host.arch,
          locale: this.host.locale(),
          $lib: 'openmotionstudio',
          $process_person_profile: false,
        },
      });
      const response = await this.host.send(POSTHOG, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (!response.ok) log('statistics.refused', { event: e.event, status: response.status });
    } catch (error) {
      log('statistics.failed', { event: e.event, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

let shared: Statistics | undefined;
/** The app's one counter, set at start by the main process (index.ts); until then, and in tests, nothing is counted. */
export const statistics = (): Statistics | undefined => shared;
export function useStatistics(host: StatisticsHost): Statistics {
  return (shared = new Statistics(host));
}
/** Counts an event on the app's counter, without waiting for it. */
export function count(e: StatisticsEvent): void {
  void shared?.count(e);
}
