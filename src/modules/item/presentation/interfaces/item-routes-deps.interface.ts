import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { UseCases } from '../../application/interfaces/use-cases.interface';

export interface ItemRoutesDeps {
  useCases: UseCases;
  middleware: RouteMiddleware;
}
