# 25. The Studio counts anonymous usage unless turned off

> **Status:** Accepted · **Date:** 2026-11-27

Whether the Studio tells its makers how it is used, what it sends, where, and who decides.

## Context

The architecture said no telemetry was planned. With v0.1.0 public, the makers could not tell how many people open the
Studio, which agents and models they use, or how often an export fails, which is what decides the next work. The
websites (motionhub.dev and openmotion.studio) count their visits in the same PostHog project.

## Decision

- **On by default, one switch to turn it off**: Settings → General, "Share anonymous usage statistics"
  (`shareUsageStatistics` in `settings.json`'s preferences, shared unless it is `false`). Only a packaged build sends;
  a dev build never does.
- **A fixed list of events** (`src/main/statistics.ts`), each with only its own fields: `app_started`, `project_opened`
  (how: open, create, recent or example), `motion_added` (its public hub id), `agent_turn` (agent kind, outcome, the
  model's id when it is `name` or `org/name`, seconds, tool calls, tokens as an order of magnitude),
  `export_finished` (seconds), `export_failed` and `export_cancelled`. Every event adds the Studio's version, the
  system, the chip and the interface locale.
- **Never** a path, a file's, project's or film's name, a brief, a prompt, a model's reply, a key, a provider's address
  or an error's text. A field that does not fit its shape is left out, not cleaned.
- **Who**: a random id made the first time an event is counted (`statisticsId` in `settings.json`), tied to no account,
  machine or other id. Events say `$process_person_profile: false`, so PostHog keeps no profile, and the project drops
  the IP address it came from.
- **Where**: PostHog's US cloud (`us.i.posthog.com/i/v0/e/`), one HTTPS request an event from the main process, through
  the session's network like the update check. No SDK. A refused or failed request is logged in the runtime log and
  not retried; it never stops or slows what it counts.

## Consequences

- The Studio has a second outgoing destination beside the update check and the person's own providers, which the
  person can turn off.
- People who upgrade start sharing without being asked; the switch and the CHANGELOG say so. Turning it off keeps the
  id, unused.
- What is counted is an IPC-free list in one file: a new event is a change there, with its fields checked by
  `statistics.test.ts`.
- Counts from people who turned it off, and from dev builds, are missing: the numbers are a floor.
