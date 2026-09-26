import type { AdminAuthMiddleware } from '@/modules/admin';
import type { UseCases } from './use-cases.interface';

export interface RegistrationInviteRoutesDeps {
  useCases: UseCases;
  adminAuth: AdminAuthMiddleware;
}
