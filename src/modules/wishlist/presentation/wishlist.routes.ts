import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { InvitesUseCases } from '@/modules/invites';
import type { UseCases } from './interfaces/use-cases.interface';
import { listsRoutes } from './routes/lists.routes';
import { prioritiesRoutes } from './routes/priorities.routes';
import { sharesRoutes } from './routes/shares.routes';
import { exportRoutes } from './routes/export.routes';
import { invitesRoutes } from './routes/invites.routes';

export const wishlistRoutes = (
  useCases: UseCases,
  inviteUseCases: InvitesUseCases | undefined,
  middleware: RouteMiddleware
) => {
  const base = new Elysia({ prefix: '/api' })
    .use(listsRoutes(useCases, middleware))
    .use(prioritiesRoutes(useCases, middleware))
    .use(sharesRoutes(useCases, middleware))
    .use(exportRoutes(useCases, middleware));

  if (!inviteUseCases) {
    return base;
  }

  return base.use(invitesRoutes(inviteUseCases, middleware));
};
