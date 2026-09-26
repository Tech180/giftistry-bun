import { Elysia, t } from 'elysia';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { createAuthMiddleware } from '../middlewares/auth.middleware';
import { getCookie } from '../utils/get-cookie.util';
import { setPasskeyChallengeCookie } from '../utils/jwt-cookie.util';

export const passkeysProtectedRoutes = ({ useCases, userRepo }: AuthRoutesDeps) =>
  new Elysia()
    .use(createAuthMiddleware(userRepo))
    .get('/passkeys', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const passkeys = await useCases.listPasskeys.execute(authUser.userId);
      return { success: true, Passkeys: passkeys };
    })
    .delete('/passkeys/:passkeyId', async ({ getAuthUser, params: { passkeyId } }) => {
      const authUser = await getAuthUser();
      await useCases.deletePasskey.execute(authUser.userId, passkeyId);
      return { success: true };
    })
    .post('/passkey/register/options', async ({ getAuthUser, set }) => {
      const authUser = await getAuthUser();
      const { options, challenge } = await useCases.registerPasskey.generateOptions(
        authUser.userId,
        authUser.Username,
        authUser.FirstName,
        authUser.LastName
      );
      setPasskeyChallengeCookie(set, challenge);
      return { success: true, options };
    })
    .post('/passkey/register/verify', async ({ getAuthUser, headers, body: { Giftistry: { Auth: { RegistrationResponse } } } }) => {
      const authUser = await getAuthUser();
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      const origin = headers['origin'] || 'http://localhost:3000';
      await useCases.registerPasskey.verify(authUser.userId, RegistrationResponse, challenge || '', origin);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            RegistrationResponse: t.Any(),
          }),
        }),
      }),
    });
