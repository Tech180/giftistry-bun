import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import { DOMAIN_ERROR_STATUS } from '@/common/domain/errors/constants/domain-error-status.constant';
import type { UserRepository } from '../../domain/ports/user.repository';
import { createAuthMiddleware } from './auth.middleware';

export function createOwnerAuthMiddleware(userRepo: UserRepository) {
  return new Elysia()
    .use(createAuthMiddleware(userRepo))
    .derive({ as: 'global' }, ({ getAuthUser }) => ({
      getOwnerUser: async () => {
        const user = await getAuthUser();
        if (!user.IsOwner) {
          throw new AppError(
            'Forbidden: Owner access required',
            DOMAIN_ERROR_STATUS.FORBIDDEN,
            'FORBIDDEN'
          );
        }
        return user;
      },
    }));
}
