import { Elysia } from 'elysia';
import type { RegistrationInviteRoutesDeps } from './interfaces/registration-invite-routes-deps.interface';
import { adminRoutes } from './routes/admin.routes';
import { publicRoutes } from './routes/public.routes';

export const registrationInviteRoutes = (deps: RegistrationInviteRoutesDeps) =>
  new Elysia().use(adminRoutes(deps)).use(publicRoutes(deps));
