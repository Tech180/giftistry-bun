import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertCanMutateAdminUser } from './assert-can-mutate-admin-user';

export class UnlockUserUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, targetId: string, ip?: string | null) {
    const target = await this.adminUserRepo.getPolicyState(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    assertCanMutateAdminUser(actorId, targetId, target.isOwner);

    await this.adminUserRepo.unlock(targetId);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.user.unlock',
      ip,
    });
  }
}
