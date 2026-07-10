import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AdminUser } from '../domain/admin-user.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class DeleteAdminUserUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, targetId: string, ip?: string | null) {
    const target = await this.adminUserRepo.getDeleteTarget(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const otherEnabledAdmins = await this.adminUserRepo.countEnabledAdmins(targetId);
    AdminUser.assertCanDelete(actorId, target, otherEnabledAdmins);

    await this.adminUserRepo.delete(targetId);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.user.delete',
      ip,
    });
  }
}
