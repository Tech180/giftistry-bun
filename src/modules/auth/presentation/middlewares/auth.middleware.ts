import { Elysia } from 'elysia';
import { verifyToken } from '@/common/utils/token';
import { AppError } from '@/common/domain/errors/app-error';
import type { UserRepository } from '../../domain/ports/user.repository';
import { getCookie } from '../utils/get-cookie.util';

export function createAuthMiddleware(userRepo: UserRepository) {
  return new Elysia()
    .derive({ as: 'global' }, async ({ headers }) => {
      return {
        getAuthUser: async () => {
          let token: string | null = null;

          const authHeader = headers['authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          } else {
            token = getCookie(headers['cookie'], 'jwt');
          }

          if (!token) {
            throw new AppError('Unauthorized: Missing token', 401, 'UNAUTHORIZED');
          }

          const payload = await verifyToken(token);
          if (!payload) {
            throw new AppError('Unauthorized: Invalid or expired token', 401, 'UNAUTHORIZED');
          }

          const user = await userRepo.findById(payload.userId);
          if (!user) {
            throw new AppError('Unauthorized: User not found', 401, 'UNAUTHORIZED');
          }

          if (user.IsDisabled) {
            throw new AppError('Your account has been disabled', 403, 'FORBIDDEN');
          }

          if (
            payload.sessionVersion !== undefined &&
            user.SessionVersion !== undefined &&
            payload.sessionVersion !== user.SessionVersion
          ) {
            throw new AppError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
          }

          userRepo.updateLastOnline(user.Id).catch(console.error);

          return {
            userId: user.Id,
            email: user.Email,
            Id: user.Id,
            Username: user.Username,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            CreatedAt: user.CreatedAt,
            Bio: user.Bio,
            Theme: user.Theme,
            Avatar: user.Avatar,
            EmailVerified: user.EmailVerified,
            TwoFactorEnabled: user.TwoFactorEnabled,
            IsAdmin: user.IsAdmin,
            IsOwner: user.IsOwner,
            IsDisabled: user.IsDisabled,
            ForcePasswordChange: user.ForcePasswordChange,
            Policy: user.PolicyJson,
            IsOnboarded: user.IsOnboarded === true,
            Tour: user.Tour,
          };
        },
        getOptionalAuthUser: async () => {
          let token: string | null = null;

          const authHeader = headers['authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          } else {
            token = getCookie(headers['cookie'], 'jwt');
          }

          if (!token) return null;
          const payload = await verifyToken(token);
          if (!payload) return null;

          const user = await userRepo.findById(payload.userId);
          if (!user) return null;

          userRepo.updateLastOnline(user.Id).catch(console.error);

          return {
            userId: user.Id,
            email: user.Email,
            Id: user.Id,
            Username: user.Username,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            CreatedAt: user.CreatedAt,
            Bio: user.Bio,
            Theme: user.Theme,
            Avatar: user.Avatar,
            EmailVerified: user.EmailVerified,
            TwoFactorEnabled: user.TwoFactorEnabled,
            IsAdmin: user.IsAdmin,
            IsOwner: user.IsOwner,
          };
        },
      };
    });
}
