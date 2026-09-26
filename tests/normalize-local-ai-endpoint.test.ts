import { expect, test, describe } from 'bun:test';
import { buildLocalAiUrl } from '@/modules/system/domain/utils/build-local-ai-url.util';
import { getLocalAiRootUrl } from '@/modules/system/domain/utils/get-local-ai-root-url.util';
import { normalizeLocalAiEndpoint } from '@/modules/system/domain/utils/normalize-local-ai-endpoint.util';

describe('normalizeLocalAiEndpoint', () => {
  test('returns null when endpoint is missing or blank', () => {
    expect(normalizeLocalAiEndpoint()).toBeNull();
    expect(normalizeLocalAiEndpoint('')).toBeNull();
    expect(normalizeLocalAiEndpoint('   ')).toBeNull();
  });

  test('returns null for invalid URLs', () => {
    expect(normalizeLocalAiEndpoint('not-a-url')).toBeNull();
  });

  test('appends /v1 for bare Ollama base URLs', () => {
    expect(normalizeLocalAiEndpoint('http://localhost:11434')).toBe('http://localhost:11434/v1');
    expect(normalizeLocalAiEndpoint('http://localhost:11434/')).toBe('http://localhost:11434/v1');
    expect(normalizeLocalAiEndpoint('http://192.168.100.80:11434')).toBe('http://192.168.100.80:11434/v1');
    expect(normalizeLocalAiEndpoint('http://192.168.100.80:11434/')).toBe('http://192.168.100.80:11434/v1');
  });

  test('preserves custom host and /v1 suffix', () => {
    expect(normalizeLocalAiEndpoint('http://192.168.100.80:11434/v1')).toBe('http://192.168.100.80:11434/v1');
  });

  test('preserves custom OpenAI-compatible path prefixes', () => {
    expect(normalizeLocalAiEndpoint('http://127.0.0.1:1234/v1')).toBe('http://127.0.0.1:1234/v1');
    expect(normalizeLocalAiEndpoint('http://proxy.local/openai/v1')).toBe('http://proxy.local/openai/v1');
  });

  test('buildLocalAiUrl joins endpoint and path', () => {
    expect(buildLocalAiUrl('http://localhost:11434/v1', 'models')).toBe('http://localhost:11434/v1/models');
  });

  test('buildLocalAiUrl throws when endpoint is missing', () => {
    expect(() => buildLocalAiUrl('', 'models')).toThrow('Local AI endpoint URL is required');
  });

  test('getLocalAiRootUrl strips /v1 suffix', () => {
    expect(getLocalAiRootUrl('http://192.168.100.80:11434/v1')).toBe('http://192.168.100.80:11434');
  });
});
