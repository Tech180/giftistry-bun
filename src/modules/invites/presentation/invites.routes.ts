import { Elysia } from 'elysia';
import type { InvitesRoutesDeps } from './interfaces/invites-routes-deps.interface';
import { emailAcceptRoutes } from './routes/email-accept.routes';
import { linkAcceptRoutes } from './routes/link-accept.routes';
import { linkPreviewRoutes } from './routes/link-preview.routes';

export const invitesRoutes = (deps: InvitesRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(linkPreviewRoutes(deps))
    .use(linkAcceptRoutes(deps))
    .use(emailAcceptRoutes(deps));
