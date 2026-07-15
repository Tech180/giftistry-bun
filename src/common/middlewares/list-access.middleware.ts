import { Elysia } from 'elysia';
import type { CheckListAccessUseCase } from '@/modules/wishlist/application/check-list-access.use-case';
import type { createAuthMiddleware } from '@/modules/auth/presentation/auth.routes';

let checkListAccessUseCaseRef: CheckListAccessUseCase;

export function createListAccessMiddleware(
  checkListAccessUseCase: CheckListAccessUseCase,
  authMiddleware: ReturnType<typeof createAuthMiddleware>
) {
  checkListAccessUseCaseRef = checkListAccessUseCase;

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
  return checkListAccessUseCaseRef.execute(userId, target, minRole);
}
