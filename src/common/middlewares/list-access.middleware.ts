import { Elysia } from 'elysia';
import type { CheckListAccessUseCase } from '@/modules/wishlist';
import type { createAuthMiddleware } from '@/modules/auth';
import { LIST_ACCESS_USE_CASE } from './constants/list-access-use-case.constant';

export function createListAccessMiddleware(
  checkListAccessUseCase: CheckListAccessUseCase,
  authMiddleware: ReturnType<typeof createAuthMiddleware>
) {
  LIST_ACCESS_USE_CASE.current = checkListAccessUseCase;

  return new Elysia()
    .use(authMiddleware)
    .derive({ as: 'global' }, async ({ getAuthUser, params }) => {
      return {
        checkListAccess: async (minRole?: 'viewer' | 'collaborator' | 'owner') => {
          const user = await getAuthUser();
          return await checkListAccessUseCase.execute(
            user.userId,
            {
              listId: params.listId,
              itemId: params.itemId,
            },
            minRole
          );
        },
      };
    });
}

export async function getListAccessContext(
  userId: string,
  target: { listId?: string; itemId?: string },
  minRole?: 'viewer' | 'collaborator' | 'owner'
) {
  if (!LIST_ACCESS_USE_CASE.current) {
    throw new Error('[list-access] CheckListAccessUseCase is not initialized');
  }
  return LIST_ACCESS_USE_CASE.current.execute(userId, target, minRole);
}
