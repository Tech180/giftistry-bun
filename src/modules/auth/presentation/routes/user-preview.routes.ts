import { Elysia } from 'elysia';
import { AppError } from '@/common/domain/errors/app-error';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { createAuthMiddleware } from '../middlewares/auth.middleware';

export const userPreviewRoutes = ({ useCases, userRepo }: AuthRoutesDeps) =>
  new Elysia()
    .use(createAuthMiddleware(userRepo))
    .get('/api/users/:userId/preview', async ({ params: { userId }, getOptionalAuthUser }) => {
      let viewerId: string | undefined;
      try {
        const viewer = await getOptionalAuthUser();
        if (viewer) {
          viewerId = viewer.userId;
        }
      } catch {
        // Ignore auth errors for preview
      }
      const preview = await useCases.userPreview.execute(userId, viewerId);
      if (!preview) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }
      return { success: true, User: preview };
    }, {
      detail: {
        tags: ['Users'],
        summary: 'Get public user preview profile',
        description:
          'Returns public user profile information like display name, username, bio, join date, theme, and avatar.',
      },
    });
