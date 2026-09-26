import type { UserRepository } from '../../../domain/ports/user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { validatePasswordPolicy } from '@/common/domain/utils/validate-password-policy.util';
import { AdminUser } from '../../../domain/admin-user.entity';
import type { ResetPasswordPayload } from '../interfaces/reset-password-payload.interface';

export class ResetUserPasswordUseCase {
  constructor(
    private userRepo: UserRepository,
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

    const target = await this.userRepo.getPolicyState(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    AdminUser.assertCanMutate(actorId, targetId, target.isOwner);

    const authHash = await Bun.password.hash(payload.password);
    await this.userRepo.resetPassword(targetId, authHash, forcePasswordChange);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.reset_password',
      ip,
    });
  }
}
