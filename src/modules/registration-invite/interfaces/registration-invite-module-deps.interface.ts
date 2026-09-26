import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import type { createAuthMiddleware } from '@/modules/auth/presentation/middlewares/auth.middleware';
import type { RegistrationInviteRepository } from '../domain/ports/registration-invite.repository';

export interface RegistrationInviteModuleDeps {
  inviteRepo: RegistrationInviteRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
}
