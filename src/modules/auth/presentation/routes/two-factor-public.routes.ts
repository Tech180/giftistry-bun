import { Elysia, t } from 'elysia';
import { createToken } from '@/common/utils/token';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { setJwtCookie } from '../utils/jwt-cookie.util';
import { withPasskeyFlag } from '../utils/with-passkey-flag.util';

export const twoFactorPublicRoutes = ({ useCases }: AuthRoutesDeps) =>
  new Elysia()
    .post('/2fa/login', async ({ set, body: { Giftistry: { Auth: { Ticket, Code } } } }) => {
      const user = await useCases.twoFactorLogin.execute(Ticket, Code);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const userWithPasskey = await withPasskeyFlag(useCases, user);
      return { success: true, User: userWithPasskey, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Ticket: t.String(),
            Code: t.String(),
          }),
        }),
      }),
    });
