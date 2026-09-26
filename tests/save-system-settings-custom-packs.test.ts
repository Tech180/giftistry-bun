import { describe, expect, test } from 'bun:test';
import { SaveSystemSettingsUseCase } from '../src/modules/system/slices/settings/use-cases/save-system-settings.use-case';
import type { ServerConfig } from '../src/modules/system/domain/interfaces/server-config.interface';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';
import type { TestAiConnectionUseCase } from '../src/modules/system/slices/ai/use-cases/test-ai-connection.use-case';

const booksPack = {
  Id: 'custom.books',
  Label: 'Books',
  Description: 'Book specs',
  Match: { Categories: [] as string[] },
  Fields: [{ Key: 'Binding', Label: 'Binding', Bucket: 'userDefined', Hint: 'hardcover' }],
  PromptFragment: 'Extract binding.',
};

function createRepo(initial: Partial<ServerConfig> = {}): ServerConfigRepository & {
  stored: ServerConfig;
} {
  const repo = {
    stored: {
      DbType: 'local',
      SmtpType: 'local',
      AiEnabled: false,
      AiEnabledPackIds: ['technology', 'technology.cpu'],
      AiCustomPacks: [booksPack],
      ...initial,
    } as ServerConfig,
    load() {
      return this.stored;
    },
    save(config: ServerConfig) {
      this.stored = config;
    },
  };
  return repo as ServerConfigRepository & { stored: ServerConfig };
}

function createUseCase(repo: ServerConfigRepository) {
  return new SaveSystemSettingsUseCase(repo, {
    execute: async () => ({ Reachable: true, ModelAvailable: true, Working: true, Message: 'ok' }),
  } as unknown as TestAiConnectionUseCase);
}

describe('SaveSystemSettingsUseCase AiCustomPacks', () => {
  test('persists sanitized custom packs and keeps custom enabled ids', async () => {
    const repo = createRepo({ AiCustomPacks: [] });
    const useCase = createUseCase(repo);

    await useCase.execute({
      AiEnabled: false,
      AiCustomPacks: [booksPack, { Id: 'technology', Label: 'Nope' }],
      AiEnabledPackIds: ['technology.cpu', 'custom.books', 'unknown-pack'],
    });

    expect(repo.stored.AiCustomPacks).toHaveLength(1);
    expect(repo.stored.AiCustomPacks?.[0].Id).toBe('custom.books');
    expect(repo.stored.AiEnabledPackIds).toEqual(['technology.cpu', 'custom.books']);
  });

  test('omitting AiCustomPacks keeps the previous custom packs', async () => {
    const repo = createRepo();
    const useCase = createUseCase(repo);

    await useCase.execute({
      AiEnabled: false,
      AiEnabledPackIds: ['technology.cpu', 'custom.books'],
    });

    expect(repo.stored.AiCustomPacks).toEqual([booksPack]);
    expect(repo.stored.AiEnabledPackIds).toEqual(['technology.cpu', 'custom.books']);
  });
});
