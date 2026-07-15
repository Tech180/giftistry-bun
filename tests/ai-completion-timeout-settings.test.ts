import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  clampAiCompletionTimeoutMs,
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
  AI_COMPLETION_TIMEOUT_MAX_MS,
  AI_COMPLETION_TIMEOUT_MIN_MS,
  toSystemSettingsView,
} from '../src/modules/system/domain/server-config.entity';

let configState: {
  AiCompletionTimeoutMs?: number;
} = {};

mock.module('../src/common/infrastructure/config.loader', () => ({
  loadConfig: () => configState,
}));

describe('clampAiCompletionTimeoutMs', () => {
  test('clamps to allowed range', () => {
    expect(clampAiCompletionTimeoutMs(1000)).toBe(AI_COMPLETION_TIMEOUT_MIN_MS);
    expect(clampAiCompletionTimeoutMs(9_999_999)).toBe(AI_COMPLETION_TIMEOUT_MAX_MS);
    expect(clampAiCompletionTimeoutMs(120_000)).toBe(120_000);
    expect(clampAiCompletionTimeoutMs('not-a-number')).toBe(DEFAULT_AI_COMPLETION_TIMEOUT_MS);
  });
});

describe('toSystemSettingsView AiCompletionTimeoutMs', () => {
  test('defaults when unset', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });
    expect(view.AiCompletionTimeoutMs).toBe(DEFAULT_AI_COMPLETION_TIMEOUT_MS);
  });

  test('returns clamped saved values', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiCompletionTimeoutMs: 5000,
    });
    expect(view.AiCompletionTimeoutMs).toBe(AI_COMPLETION_TIMEOUT_MIN_MS);
  });
});

describe('resolveCompletionTimeoutMs prefers config over env', () => {
  const originalEnv = process.env.AI_COMPLETION_TIMEOUT_MS;

  beforeEach(() => {
    configState = {};
    delete process.env.AI_COMPLETION_TIMEOUT_MS;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AI_COMPLETION_TIMEOUT_MS;
    else process.env.AI_COMPLETION_TIMEOUT_MS = originalEnv;
  });

  test('uses config when present', async () => {
    configState = { AiCompletionTimeoutMs: 180_000 };
    process.env.AI_COMPLETION_TIMEOUT_MS = '60000';

    const { resolveCompletionTimeoutMs } = await import(
      '../src/modules/item/infrastructure/ai-text-completion'
    );

    expect(resolveCompletionTimeoutMs()).toBe(180_000);
  });

  test('falls back to env then default', async () => {
    configState = {};
    process.env.AI_COMPLETION_TIMEOUT_MS = '90000';

    const { resolveCompletionTimeoutMs } = await import(
      '../src/modules/item/infrastructure/ai-text-completion'
    );

    expect(resolveCompletionTimeoutMs()).toBe(90_000);

    delete process.env.AI_COMPLETION_TIMEOUT_MS;
    expect(resolveCompletionTimeoutMs()).toBe(DEFAULT_AI_COMPLETION_TIMEOUT_MS);
  });
});
