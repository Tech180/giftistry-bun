import { describe, expect, test } from 'bun:test';
import {
  normalizeAiProvider,
  toSystemSettingsView,
} from '../src/modules/system/domain/server-config.entity';
import {
  isAiSlotConfigured,
  resolveAiConnection,
} from '../src/common/utils/resolve-ai-connection.util';

describe('normalizeAiProvider', () => {
  test('keeps local and maps everything else to openrouter', () => {
    expect(normalizeAiProvider('local')).toBe('local');
    expect(normalizeAiProvider('openrouter')).toBe('openrouter');
    expect(normalizeAiProvider('gemini')).toBe('openrouter');
    expect(normalizeAiProvider('openai')).toBe('openrouter');
    expect(normalizeAiProvider(undefined)).toBe('openrouter');
  });
});

describe('toSystemSettingsView slot connections', () => {
  test('exposes per-slot fields and omits shared trio', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiFastProvider: 'local',
      AiFastEndpoint: 'http://localhost:11434/v1',
      AiFastApiKey: 'fast-secret',
      AiFastModel: 'qwen3:8b',
      AiIntelligentProvider: 'openrouter',
      AiIntelligentEndpoint: '',
      AiIntelligentApiKey: 'intel-secret',
      AiIntelligentModel: 'google/gemini-2.5-flash',
    });

    expect(view.AiFastProvider).toBe('local');
    expect(view.AiFastEndpoint).toBe('http://localhost:11434/v1');
    expect(view.AiFastApiKey).toBe('******');
    expect(view.AiIntelligentProvider).toBe('openrouter');
    expect(view.AiIntelligentApiKey).toBe('******');
    expect((view as Record<string, unknown>).AiProvider).toBeUndefined();
    expect((view as Record<string, unknown>).AiEndpoint).toBeUndefined();
    expect((view as Record<string, unknown>).AiApiKey).toBeUndefined();
  });

  test('defaults slot providers to openrouter', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });
    expect(view.AiFastProvider).toBe('openrouter');
    expect(view.AiIntelligentProvider).toBe('openrouter');
  });
});

describe('resolveAiConnection', () => {
  test('returns independent values per slot', () => {
    const config = {
      AiFastProvider: 'local',
      AiFastEndpoint: 'http://localhost:11434/v1',
      AiFastApiKey: '',
      AiFastModel: 'qwen3.5:9b',
      AiIntelligentProvider: 'openrouter',
      AiIntelligentEndpoint: '',
      AiIntelligentApiKey: 'or-key',
      AiIntelligentModel: 'anthropic/claude-sonnet-4',
    };

    expect(resolveAiConnection(config, 'fast')).toEqual({
      provider: 'local',
      endpoint: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'qwen3.5:9b',
    });
    expect(resolveAiConnection(config, 'intelligent')).toEqual({
      provider: 'openrouter',
      endpoint: '',
      apiKey: 'or-key',
      model: 'anthropic/claude-sonnet-4',
    });
  });

  test('falls back to legacy shared trio when slot fields unset', () => {
    const config = {
      AiProvider: 'gemini',
      AiEndpoint: 'https://legacy.example/v1',
      AiApiKey: 'legacy-key',
      AiFastModel: 'fast',
      AiIntelligentModel: 'smart',
    };

    const fast = resolveAiConnection(config, 'fast');
    expect(fast.provider).toBe('openrouter');
    expect(fast.endpoint).toBe('https://legacy.example/v1');
    expect(fast.apiKey).toBe('legacy-key');
    expect(fast.model).toBe('fast');
  });

  test('isAiSlotConfigured requires endpoint for local and key for openrouter', () => {
    expect(
      isAiSlotConfigured({
        provider: 'local',
        endpoint: 'http://localhost:11434/v1',
        apiKey: '',
        model: 'x',
      })
    ).toBe(true);
    expect(
      isAiSlotConfigured({
        provider: 'local',
        endpoint: '',
        apiKey: '',
        model: 'x',
      })
    ).toBe(false);
    expect(
      isAiSlotConfigured({
        provider: 'openrouter',
        endpoint: '',
        apiKey: 'k',
        model: 'x',
      })
    ).toBe(true);
  });
});
