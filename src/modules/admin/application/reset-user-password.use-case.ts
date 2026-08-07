import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { validatePasswordPolicy } from '@/common/domain/password-policy';
import { assertCanMutateAdminUser } from './assert-can-mutate-admin-user';

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
    const forcePasswordChange = !!payload.forcePasswordChange;
    validatePasswordPolicy(payload.password, {
      requireStrong: sitePolicy.RequireStrongPasswords && !forcePasswordChange,
    });

    const target = await this.adminUserRepo.getPolicyState(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    assertCanMutateAdminUser(actorId, targetId, target.isOwner);

    const authHash = await Bun.password.hash(payload.password);
    await this.adminUserRepo.resetPassword(targetId, authHash, forcePasswordChange);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.reset_password',
      ip,
    });
  }
}
