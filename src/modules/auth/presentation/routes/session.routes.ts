import { Elysia } from 'elysia';
import { createToken } from '@/common/utils/token';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { createAuthMiddleware } from '../middlewares/auth.middleware';
import { changePasswordBodySchema } from '../schemas/change-password-body.schema';
import { deleteAccountBodySchema } from '../schemas/delete-account-body.schema';
import { clearJwtCookie, setJwtCookie } from '../utils/jwt-cookie.util';
import { withPasskeyFlag } from '../utils/with-passkey-flag.util';

export const sessionRoutes = ({ useCases, userRepo, serverConfigRepo }: AuthRoutesDeps) =>
  new Elysia()
    .use(createAuthMiddleware(userRepo))
    .get('/me', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const user = await useCases.getCurrentUser.execute(authUser.userId);
      const config = serverConfigRepo.load();
      const userPolicy = authUser.Policy as { CanUseAiFeatures?: boolean } | undefined;

      const canUseAi = Boolean(
        config.AiEnabled &&
        user.AiEnabled !== false &&
        userPolicy?.CanUseAiFeatures !== false
      );

      const canUseWebSearch = Boolean(
        config.AiEnabled &&
        config.AiWebSearchEnabled &&
        user.AiEnabled !== false &&
        user.WebSearchEnabled !== false &&
        userPolicy?.CanUseAiFeatures !== false
      );

      const userWithPasskey = await withPasskeyFlag(useCases, user);
      return {
        success: true,
        User: userWithPasskey,
        Capabilities: {
          CanUseAi: canUseAi,
          CanUseWebSearch: canUseWebSearch,
        },
      };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Get active user profile',
        description:
          'Extracts the JWT from cookie/bearer token and returns the authenticated user context with user capabilities.',
        security: [{ bearerAuth: [] }],
      },
    })
    .post('/logout', async ({ set }) => {
      clearJwtCookie(set);
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Clears the JWT session cookie.',
      },
    })
    .post('/password', async ({ set, getAuthUser, body: { Giftistry: { Auth: { CurrentPassword, NewPassword } } } }) => {
      const authUser = await getAuthUser();
      const user = await useCases.changePassword.execute(authUser.userId, CurrentPassword, NewPassword);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const userWithPasskey = await withPasskeyFlag(useCases, user);
      return { success: true, User: userWithPasskey, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Change password',
        description:
          'Updates the authenticated user password, clears force-password-change, and re-issues the session token.',
        security: [{ bearerAuth: [] }],
      },
      body: changePasswordBodySchema,
    })
    .post('/account/disable', async ({ getAuthUser, request }) => {
      const authUser = await getAuthUser();
      await useCases.disableAccount.execute(
        authUser.userId,
        Boolean(authUser.IsOwner),
        request.headers.get('x-forwarded-for')
      );
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Disable own account',
        security: [{ bearerAuth: [] }],
      },
    })
    .delete('/account', async ({ getAuthUser, body: { Giftistry: { Auth: { Password } } }, request, set }) => {
      const authUser = await getAuthUser();
      await useCases.deleteAccount.execute(
        authUser.userId,
        Boolean(authUser.IsOwner),
        Password,
        request.headers.get('x-forwarded-for')
      );
      clearJwtCookie(set);
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Delete own account',
        security: [{ bearerAuth: [] }],
      },
      body: deleteAccountBodySchema,
    });
