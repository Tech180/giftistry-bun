import type { UserRepository } from '../../../domain/ports/user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { AdminUser } from '../../../domain/admin-user.entity';
import type { UserPolicyUpdatePayload } from '../../../domain/interfaces/user-policy-update-payload.interface';
import { AppError } from '@/common/domain/errors/app-error';
export class UpdateUserPolicyUseCase {
  constructor(
    private userRepo: UserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(
    actorId: string,
    targetId: string,
    policyPayload: UserPolicyUpdatePayload,
    ip?: string | null
  ) {
    const target = await this.userRepo.getPolicyState(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    AdminUser.assertCanMutate(actorId, targetId, target.isOwner);

    const otherEnabledAdmins = await this.userRepo.countEnabledAdmins(targetId);
    const resolved = AdminUser.resolvePolicyUpdate(actorId, target, policyPayload, otherEnabledAdmins);

    await this.userRepo.updatePolicy(
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
