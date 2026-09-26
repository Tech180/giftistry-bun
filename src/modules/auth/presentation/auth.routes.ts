import { Elysia } from 'elysia';
import { rateLimit } from '@/common/middlewares/rate-limit.middleware';
import type { AuthRoutesDeps } from './interfaces/auth-routes-deps.interface';
import { customThemesRoutes } from './routes/custom-themes.routes';
import { oidcRoutes } from './routes/oidc.routes';
import { passkeysProtectedRoutes } from './routes/passkeys-protected.routes';
import { passkeysPublicRoutes } from './routes/passkeys-public.routes';
import { profileRoutes } from './routes/profile.routes';
import { sessionPublicRoutes } from './routes/session-public.routes';
import { sessionRoutes } from './routes/session.routes';
import { twoFactorProtectedRoutes } from './routes/two-factor-protected.routes';
import { twoFactorPublicRoutes } from './routes/two-factor-public.routes';
import { userPreviewRoutes } from './routes/user-preview.routes';

export const authRoutes = (deps: AuthRoutesDeps) =>
  new Elysia()
    .use(userPreviewRoutes(deps))
    .use(customThemesRoutes(deps))
    .group('/api/auth', (group) =>
      group
        .use(rateLimit({ windowMs: 60000, max: 5 }))
        .use(sessionPublicRoutes(deps))
        .use(passkeysPublicRoutes(deps))
        .use(twoFactorPublicRoutes(deps))
        .use(oidcRoutes(deps))
        .use(sessionRoutes(deps))
        .use(profileRoutes(deps))
        .use(passkeysProtectedRoutes(deps))
        .use(twoFactorProtectedRoutes(deps))
    );
