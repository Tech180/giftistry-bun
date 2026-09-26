import type { createAuthMiddleware } from '@/modules/auth/presentation/middlewares/auth.middleware';
import type { CreateReportUseCase } from '../../slices/reports/use-cases/create-report.use-case';

export interface ReportsRoutesDeps {
  createReport: CreateReportUseCase;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
}
