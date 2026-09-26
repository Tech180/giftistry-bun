import { Elysia } from 'elysia';
import { createToken } from '@/common/utils/token';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { signupBodySchema } from '../schemas/signup-body.schema';
import { loginBodySchema } from '../schemas/login-body.schema';
import { setJwtCookie } from '../utils/jwt-cookie.util';
import { withPasskeyFlag } from '../utils/with-passkey-flag.util';

export const sessionPublicRoutes = ({ useCases }: AuthRoutesDeps) =>
  new Elysia()
    .post('/signup', async ({ set, body: { Giftistry: { Auth: { Username, Email, Password, FirstName, LastName, InviteToken } } } }) => {
      const user = await useCases.signup.execute(
        Username,
        Email ?? null,
        Password,
        FirstName ?? undefined,
        LastName ?? undefined,
        InviteToken ?? null
      );
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description:
          'Creates a new user profile (email optional), optionally sends email verification, and sets the JWT session cookie.',
      },
      body: signupBodySchema,
    })
    .post('/login', async ({ set, body: { Giftistry: { Auth: { Username, Password } } } }) => {
      const user = await useCases.login.execute(Username, Password);

      if (user.TwoFactorEnabled) {
        const ticket = await useCases.twoFactorLogin.createTicket(user.Id);
        return { success: true, Require2FA: true, Ticket: ticket };
      }

      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const userWithPasskey = await withPasskeyFlag(useCases, user);
      return { success: true, User: userWithPasskey, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Authenticate a user',
        description:
          'Verifies username/password and sets the HTTP-only JWT session cookie. Redirects to 2FA if enabled.',
      },
      body: loginBodySchema,
    });
