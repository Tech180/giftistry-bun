import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  clampAiConnectTimeoutMs,
  DEFAULT_AI_CONNECT_TIMEOUT_MS,
  AI_CONNECT_TIMEOUT_MAX_MS,
  AI_CONNECT_TIMEOUT_MIN_MS,
  toSystemSettingsView,
} from '../src/modules/system/domain/server-config.entity';

let configState: {
  AiConnectTimeoutMs?: number;
} = {};

mock.module('../src/common/infrastructure/config.loader', () => ({
  loadConfig: () => configState,
}));

describe('clampAiConnectTimeoutMs', () => {
  test('clamps to allowed range', () => {
    expect(clampAiConnectTimeoutMs(100)).toBe(AI_CONNECT_TIMEOUT_MIN_MS);
    expect(clampAiConnectTimeoutMs(9_999_999)).toBe(AI_CONNECT_TIMEOUT_MAX_MS);
    expect(clampAiConnectTimeoutMs(5_000)).toBe(5_000);
    expect(clampAiConnectTimeoutMs('not-a-number')).toBe(DEFAULT_AI_CONNECT_TIMEOUT_MS);
  });
});

describe('toSystemSettingsView AiConnectTimeoutMs', () => {
  test('defaults when unset', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });
    expect(view.AiConnectTimeoutMs).toBe(DEFAULT_AI_CONNECT_TIMEOUT_MS);
  });

  test('returns clamped saved values', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiConnectTimeoutMs: 100,
    });
    expect(view.AiConnectTimeoutMs).toBe(AI_CONNECT_TIMEOUT_MIN_MS);
  });
});

describe('resolveAiConnectTimeoutMs prefers config over env', () => {
  const originalEnv = process.env.AI_CONNECT_TIMEOUT_MS;

  beforeEach(() => {
    configState = {};
    delete process.env.AI_CONNECT_TIMEOUT_MS;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AI_CONNECT_TIMEOUT_MS;
    else process.env.AI_CONNECT_TIMEOUT_MS = originalEnv;
  });

  test('uses config when present', async () => {
    configState = { AiConnectTimeoutMs: 8_000 };
    process.env.AI_CONNECT_TIMEOUT_MS = '2000';

    const { resolveAiConnectTimeoutMs } = await import('../src/common/utils/ai-fetch.util');

    expect(resolveAiConnectTimeoutMs()).toBe(8_000);
  });

  test('falls back to env then default', async () => {
    configState = {};
    process.env.AI_CONNECT_TIMEOUT_MS = '2500';

    const { resolveAiConnectTimeoutMs } = await import('../src/common/utils/ai-fetch.util');

    expect(resolveAiConnectTimeoutMs()).toBe(2_500);

    delete process.env.AI_CONNECT_TIMEOUT_MS;
    expect(resolveAiConnectTimeoutMs()).toBe(DEFAULT_AI_CONNECT_TIMEOUT_MS);
  });
});
