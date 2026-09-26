import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { UseCases } from './use-cases.interface';

export interface CommentRoutesDeps {
  useCases: UseCases;
  middleware: RouteMiddleware;
}
