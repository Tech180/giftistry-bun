import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { validatePasswordPolicy } from '@/common/domain/password-policy';

export interface ResetPasswordPayload {
  password: string;
  forcePasswordChange?: boolean;
}

export class ResetUserPasswordUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(actorId: string, targetId: string, payload: ResetPasswordPayload, ip?: string | null) {
    if (!payload?.password) {
      throw new AppError('Password is required', 400, 'BAD_REQUEST');
    }

    const sitePolicy = await this.getSitePolicy.execute();
    validatePasswordPolicy(payload.password, { requireStrong: sitePolicy.RequireStrongPasswords });

    const exists = await this.adminUserRepo.exists(targetId);
    if (!exists) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const authHash = await Bun.password.hash(payload.password);
    await this.adminUserRepo.resetPassword(targetId, authHash, payload.forcePasswordChange ?? false);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.reset_password',
      ip,
    });
  }
}
