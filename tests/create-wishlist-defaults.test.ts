import { beforeEach, describe, expect, test } from 'bun:test';
import { CreateWishlistUseCase } from '../src/modules/wishlist/application/create-wishlist.use-case';
import type { ServerConfigRepository } from '../src/modules/system/domain/ports/server-config.repository';

let config = { AiEnabled: true, AiWebSearchEnabled: true };
let userAi = true;
let userWeb = true;
let policyOk = true;

describe('CreateWishlistUseCase defaults', () => {
  beforeEach(() => {
    config = { AiEnabled: true, AiWebSearchEnabled: true };
    userAi = true;
    userWeb = true;
    policyOk = true;
  });

  function makeUseCase(createSpy: (args: unknown[]) => void) {
    const configRepo = {
      load: () => config,
    } as unknown as ServerConfigRepository;

    return new CreateWishlistUseCase(
      {
        create: async (...args: unknown[]) => {
          createSpy(args);
          return {
            Id: 'list-1',
            UserId: 'user-1',
            Title: 'List',
            ExpiresAt: null,
            AllowGroupFunds: false,
            IsActive: true,
            AiEnabled: args[6],
            WebSearchEnabled: args[7],
          };
        },
      } as never,
      {
        findById: async () => ({
          Id: 'user-1',
          AiEnabled: userAi,
          WebSearchEnabled: userWeb,
        }),
      } as never,
      {
        execute: async () => undefined,
      } as never,
      {
        execute: async () => {
          if (!policyOk) throw new Error('policy blocked');
        },
      } as never,
      configRepo
    );
  }

  test('defaults AI and web search on when server and user allow', async () => {
    let created: unknown[] = [];
    const useCase = makeUseCase((args) => {
      created = args;
    });

    await useCase.execute('user-1', 'Holiday');
    expect(created[6]).toBe(true);
    expect(created[7]).toBe(true);
  });

  test('defaults AI off when server AI is disabled', async () => {
    config = { AiEnabled: false, AiWebSearchEnabled: true };
    let created: unknown[] = [];
    const useCase = makeUseCase((args) => {
      created = args;
    });

    await useCase.execute('user-1', 'Holiday');
    expect(created[6]).toBe(false);
    expect(created[7]).toBe(false);
  });

  test('defaults web search off when user opted out of web search', async () => {
    userWeb = false;
    let created: unknown[] = [];
    const useCase = makeUseCase((args) => {
      created = args;
    });

    await useCase.execute('user-1', 'Holiday');
    expect(created[6]).toBe(true);
    expect(created[7]).toBe(false);
  });

  test('respects explicit false overrides', async () => {
    let created: unknown[] = [];
    const useCase = makeUseCase((args) => {
      created = args;
    });

    await useCase.execute('user-1', 'Holiday', null, false, 'generic', true, false, false);
    expect(created[6]).toBe(false);
    expect(created[7]).toBe(false);
  });
});
