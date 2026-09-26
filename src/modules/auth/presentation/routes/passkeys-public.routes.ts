import { Elysia, t } from 'elysia';
import { createToken } from '@/common/utils/token';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { getCookie } from '../utils/get-cookie.util';
import { setJwtCookie, setPasskeyChallengeCookie } from '../utils/jwt-cookie.util';
import { withPasskeyFlag } from '../utils/with-passkey-flag.util';

export const passkeysPublicRoutes = ({ useCases, userRepo }: AuthRoutesDeps) =>
  new Elysia()
    .post('/passkey/login/options', async ({ set }) => {
      const { options, challenge } = await useCases.passkeyLogin.generateOptions();
      setPasskeyChallengeCookie(set, challenge);
      return { success: true, options };
    })
    .post('/passkey/login/verify', async ({ set, headers, body: { Giftistry: { Auth: { AuthenticationResponse } } } }) => {
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      const origin = headers['origin'] || 'http://localhost:3000';
      const user = await useCases.passkeyLogin.verify(AuthenticationResponse, challenge || '', origin);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const userWithPasskey = await withPasskeyFlag(useCases, user);
      return { success: true, User: userWithPasskey, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            AuthenticationResponse: t.Any(),
          }),
        }),
      }),
    })
    .post('/passkey/check', async ({ body: { Giftistry: { Auth: { Username } } } }) => {
      const user = await userRepo.findByUsername(Username);
      if (!user) {
        return { success: true, HasPasskey: false };
      }
      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return { success: true, HasPasskey: passkeys.length > 0 };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Username: t.String(),
          }),
        }),
      }),
    });
