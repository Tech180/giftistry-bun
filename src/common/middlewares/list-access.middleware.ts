import { Elysia } from 'elysia';
import { PostgresListShareRepository } from '@/modules/wishlist/infrastructure/postgres-list-share.repository';
import { PostgresFriendRepository } from '@/modules/friends/infrastructure/postgres-friend.repository';
import { AppError } from './error.middleware';
import { sql } from '../database/connection';
import { authMiddleware } from '@/modules/auth/presentation/auth.routes';

const listShareRepo = new PostgresListShareRepository();
const friendRepo = new PostgresFriendRepository();

export async function getListAccessContext(userId: string, target: { listId?: string; itemId?: string }) {
  let listId = target.listId;
  if (!listId && target.itemId) {
    listId = await listShareRepo.findListIdByItemId(target.itemId) || undefined;
  }
  if (!listId) {
    throw new AppError('List or Item not found', 404, 'NOT_FOUND');
  }

  const [list] = await sql<any[]>`
    SELECT l.id, l.user_id as "userId",
           l.expires_at as "expiresAt", l.is_active as "isActive",
           owner.is_disabled as "ownerDisabled"
    FROM lists l
    JOIN users owner ON owner.id = l.user_id
    WHERE l.id = ${listId}
  `;
  if (!list) {
    throw new AppError('List not found', 404, 'NOT_FOUND');
  }

  if (list.ownerDisabled) {
    throw new AppError('This wishlist is unavailable because the owner account is disabled', 403, 'FORBIDDEN');
  }

  let role = await listShareRepo.getRole(listId, userId);

  if (!role) {
    if (list.userId === userId) {
      role = 'owner';
    }
  }

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
