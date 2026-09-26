import { Elysia } from 'elysia';
import { createToken } from '@/common/utils/token';
import { AppError } from '@/common/domain/errors/app-error';
import { getPublicAppUrl } from '@/common/utils/public-app-url.util';
import type { AuthRoutesDeps } from '../interfaces/auth-routes-deps.interface';
import { setJwtCookie } from '../utils/jwt-cookie.util';

export const oidcRoutes = ({ useCases }: AuthRoutesDeps) =>
  new Elysia()
    .get('/oauth/authorize', async ({ set, query }) => {
      const invite =
        typeof query.invite === 'string' && query.invite.trim() ? query.invite.trim() : null;
      const result = await useCases.beginOidcLogin.execute(invite);
      set.status = 302;
      set.headers['Location'] = result.AuthorizationUrl;
      return '';
    })
    .get('/oauth/callback', async ({ query, set }) => {
      const code = typeof query.code === 'string' ? query.code : '';
      const state = typeof query.state === 'string' ? query.state : '';
      if (!code || !state) {
        throw new AppError('Missing OAuth callback parameters', 400, 'BAD_REQUEST');
      }

      const user = await useCases.handleOidcCallback.execute(code, state);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);

      const redirectBase = getPublicAppUrl() || 'http://localhost:3000';
      const redirectUrl = new URL('/login', redirectBase);
      redirectUrl.searchParams.set('token', token);
      if (user.IsOnboarded !== true) {
        redirectUrl.pathname = '/onboarding';
      }

      set.status = 302;
      set.headers['Location'] = redirectUrl.toString();
      return '';
    });
