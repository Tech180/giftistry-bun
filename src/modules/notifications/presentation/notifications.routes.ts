import { Elysia } from 'elysia';
import type { NotificationsRoutesDeps } from './interfaces/notifications-routes-deps.interface';
import { inboxRoutes } from './routes/inbox.routes';
import { preferencesRoutes } from './routes/preferences.routes';
import { pushRoutes } from './routes/push.routes';

export const notificationsRoutes = (deps: NotificationsRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(inboxRoutes(deps))
    .use(preferencesRoutes(deps))
    .use(pushRoutes(deps));
