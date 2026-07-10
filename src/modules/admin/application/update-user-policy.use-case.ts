import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AdminUser, type UserPolicyUpdatePayload } from '../domain/admin-user.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class UpdateUserPolicyUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(
    actorId: string,
    targetId: string,
    policyPayload: UserPolicyUpdatePayload,
    ip?: string | null
  ) {
    const target = await this.adminUserRepo.getPolicyState(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const otherEnabledAdmins = await this.adminUserRepo.countEnabledAdmins(targetId);
    const resolved = AdminUser.resolvePolicyUpdate(actorId, target, policyPayload, otherEnabledAdmins);

    await this.adminUserRepo.updatePolicy(
      targetId,
      resolved.nextIsAdmin,
      resolved.nextIsDisabled,
      resolved.nextIsHidden,
      resolved.nextLockout,
      resolved.nextForcePw,
      resolved.mergedPolicy
    );

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.policy_change',
      metadata: policyPayload,
      ip,
    });
  }
}
