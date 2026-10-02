import { describe, expect, test } from 'bun:test';
import { clampAiWebSearchMaxPages } from '@/modules/system';
import { buildPersistedServerConfig } from '@/modules/system';

describe('AiWebSearchMaxPages config', () => {
  test('clamps pages into supported bounds', () => {
    expect(clampAiWebSearchMaxPages(0)).toBe(1);
    expect(clampAiWebSearchMaxPages(99)).toBe(8);
    expect(clampAiWebSearchMaxPages(3)).toBe(3);
  });

  test('persists endpoint and max pages in server config', () => {
    const persisted = buildPersistedServerConfig({
      DbType: 'local',
      SmtpType: 'local',
      AiWebSearchEndpoint: 'https://search.example/',
      AiWebSearchMaxPages: 4,
    });
    expect(persisted.AiWebSearchEndpoint).toBe('https://search.example');
    expect(persisted.AiWebSearchMaxPages).toBe(4);
  });
});
