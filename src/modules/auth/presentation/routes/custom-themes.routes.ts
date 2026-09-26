import { Elysia } from 'elysia';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { createAuthMiddleware } from '../middlewares/auth.middleware';
import { saveCustomThemeBodySchema } from '../schemas/save-custom-theme-body.schema';
import { mapSaveCustomThemePayload } from '../utils/map-save-custom-theme-payload.util';

export const customThemesRoutes = ({ useCases, userRepo }: AuthRoutesDeps) =>
  new Elysia()
    .use(createAuthMiddleware(userRepo))
    .get('/api/themes/custom', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const themes = await useCases.listCustomThemes.execute(authUser.userId);
      return { success: true, Themes: themes };
    }, {
      detail: {
        tags: ['Themes'],
        summary: 'Get custom themes of active user',
        description: 'Returns all database-persisted custom themes created by the authenticated user.',
        security: [{ bearerAuth: [] }],
      },
    })
    .post('/api/themes/custom', async ({ getAuthUser, body: { Giftistry: { Theme } } }) => {
      const authUser = await getAuthUser();
      const saved = await useCases.saveCustomTheme.execute(
        authUser.userId,
        mapSaveCustomThemePayload(Theme)
      );
      return { success: true, Theme: saved };
    }, {
      detail: {
        tags: ['Themes'],
        summary: 'Create or update a custom theme',
        description: 'Persists custom theme details in the database.',
        security: [{ bearerAuth: [] }],
      },
      body: saveCustomThemeBodySchema,
    })
    .delete('/api/themes/custom/:id', async ({ getAuthUser, params: { id } }) => {
      const authUser = await getAuthUser();
      await useCases.deleteCustomTheme.execute(authUser.userId, id);
      return { success: true };
    }, {
      detail: {
        tags: ['Themes'],
        summary: 'Delete a custom theme',
        description: 'Removes a custom theme by ID from the database.',
        security: [{ bearerAuth: [] }],
      },
    });
