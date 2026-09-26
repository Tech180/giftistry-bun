import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  AI_CONNECT_TIMEOUT_MAX_MS,
  AI_CONNECT_TIMEOUT_MIN_MS,
  DEFAULT_AI_CONNECT_TIMEOUT_MS,
} from '../src/modules/system/domain/constants/ai-timeout.constant';
import { clampAiConnectTimeoutMs } from '../src/modules/system/domain/utils/clamp-server-config-limits.util';
import { toSystemSettingsView } from '../src/modules/system/domain/utils/to-system-settings-view.util';

let configState: {
  AiConnectTimeoutMs?: number;
} = {};

mock.module('../src/common/config/utils/server-config-file.util', () => ({
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
