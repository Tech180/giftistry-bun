import { Elysia } from 'elysia';
import { PostgresListShareRepository } from '@/modules/wishlist/infrastructure/postgres-list-share.repository';
import { AppError } from './error.middleware';
import { sql } from '../database/connection';
import { authMiddleware } from '@/modules/auth/presentation/auth.routes';

const listShareRepo = new PostgresListShareRepository();

export async function getListAccessContext(userId: string, target: { listId?: string; itemId?: string }) {
  let listId = target.listId;
  if (!listId && target.itemId) {
    listId = await listShareRepo.findListIdByItemId(target.itemId) || undefined;
  }
  if (!listId) {
    throw new AppError('List or Item not found', 404, 'NOT_FOUND');
  }

  // Fetch list details to check existence and expiration
  const [list] = await sql<any[]>`
    SELECT id, expires_at as "expiresAt", is_active as "isActive" FROM lists WHERE id = ${listId}
  `;
  if (!list) {
    throw new AppError('List not found', 404, 'NOT_FOUND');
  }

  const role = await listShareRepo.getRole(listId, userId);
  if (!role) {
    throw new AppError('Forbidden: You do not have access to this wishlist', 403, 'FORBIDDEN');
  }

  const isExpired = list.expiresAt ? new Date() > new Date(list.expiresAt) : false;

  return {
    listId,
    role,
    isExpired,
    isActive: list.isActive,
  };
}

export const listAccessMiddleware = new Elysia()
  .use(authMiddleware)
  .derive({ as: 'global' }, async ({ getAuthUser, params }) => {
    return {
      checkListAccess: async (minRole?: 'viewer' | 'collaborator' | 'owner') => {
        const user = await getAuthUser();
        const access = await getListAccessContext(user.userId, {
          listId: params.listId,
          itemId: params.itemId
        });

        if (minRole) {
          const roleHierarchy = { viewer: 1, collaborator: 2, owner: 3 };
          if (roleHierarchy[access.role] < roleHierarchy[minRole]) {
            throw new AppError(`Forbidden: Requires at least ${minRole} role`, 403, 'FORBIDDEN');
          }
        }
        return access;
      }
    };
  });
