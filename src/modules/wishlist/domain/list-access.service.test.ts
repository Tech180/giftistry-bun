import { describe, expect, it, mock } from 'bun:test';
import { ListAccessService } from './list-access.service';
import { AppError } from '@/common/middlewares/error.middleware';

describe('ListAccessService', () => {
  it('resolves access when itemId is a substitution join-row id', async () => {
    const listAccessRepo = {
      findListIdByItemId: mock(() => Promise.resolve('list-1')),
      findAccessInfo: mock(() =>
        Promise.resolve({
          listId: 'list-1',
          ownerId: 'owner-1',
          expiresAt: null,
          isActive: true,
          ownerDisabled: false,
        })
      ),
    };
    const listShareRepo = {
      getRole: mock(() => Promise.resolve('viewer' as const)),
    };
    const service = new ListAccessService(listAccessRepo as never, listShareRepo as never);

    const access = await service.resolve('viewer-1', { itemId: 'substitution-row-1' });

    expect(listAccessRepo.findListIdByItemId).toHaveBeenCalledWith('substitution-row-1');
    expect(access.listId).toBe('list-1');
    expect(access.role).toBe('viewer');
  });

  it('throws List or Item not found when the id cannot be resolved', async () => {
    const listAccessRepo = {
      findListIdByItemId: mock(() => Promise.resolve(null)),
      findAccessInfo: mock(() => Promise.resolve(null)),
    };
    const listShareRepo = {
      getRole: mock(() => Promise.resolve(null)),
    };
    const service = new ListAccessService(listAccessRepo as never, listShareRepo as never);

    await expect(service.resolve('viewer-1', { itemId: 'missing' })).rejects.toMatchObject({
      message: 'List or Item not found',
      statusCode: 404,
    } satisfies Partial<AppError>);
  });
});
