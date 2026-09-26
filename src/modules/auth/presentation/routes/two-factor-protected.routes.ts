import { Elysia, t } from 'elysia';
import { generateTotpSetup } from '../../slices/two-factor/utils/generate-totp-setup.util';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { createAuthMiddleware } from '../middlewares/auth.middleware';

export const twoFactorProtectedRoutes = ({ useCases, userRepo }: AuthRoutesDeps) =>
  new Elysia()
    .use(createAuthMiddleware(userRepo))
    .post('/2fa/setup', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const { secret, otpAuthUri } = generateTotpSetup(authUser.email ?? authUser.Username);
      return { success: true, Secret: secret, OtpAuthUri: otpAuthUri };
    })
    .post('/2fa/enable', async ({ getAuthUser, body: { Giftistry: { Auth: { Secret, Code } } } }) => {
      const authUser = await getAuthUser();
      const recoveryCodes = await useCases.enable2fa.execute(authUser.userId, Secret, Code);
      return { success: true, RecoveryCodes: recoveryCodes };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Secret: t.String(),
            Code: t.String(),
          }),
        }),
      }),
    })
    .post('/2fa/disable', async ({ getAuthUser, body: { Giftistry: { Auth: { Code } } } }) => {
      const authUser = await getAuthUser();
      await useCases.disable2fa.execute(authUser.userId, Code);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Code: t.String(),
          }),
        }),
      }),
    });
