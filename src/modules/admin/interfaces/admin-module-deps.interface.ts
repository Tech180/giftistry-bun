import type { UserRepository } from '../domain/ports/user.repository';
import type { ModerationRepository } from '../domain/ports/moderation.repository';
import type { ReportRepository } from '../domain/ports/report.repository';
import type { AuditLogRepository } from '@/common/domain/ports/audit-log.repository';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { SaveSitePolicyUseCase } from '@/common/application/use-cases/save-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import type { createAuthMiddleware } from '@/modules/auth/presentation/middlewares/auth.middleware';

export interface AdminModuleDeps {
  userRepo: UserRepository;
  moderationRepo: ModerationRepository;
  reportRepo: ReportRepository;
  auditLogRepo: AuditLogRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  saveSitePolicyUseCase: SaveSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
}
