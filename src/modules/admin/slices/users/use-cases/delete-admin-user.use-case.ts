import type { UserRepository } from '../../../domain/ports/user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { AdminUser } from '../../../domain/admin-user.entity';
import { AppError } from '@/common/domain/errors/app-error';

export class DeleteAdminUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, targetId: string, ip?: string | null) {
    const target = await this.userRepo.getDeleteTarget(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const otherEnabledAdmins = await this.userRepo.countEnabledAdmins(targetId);
    AdminUser.assertCanDelete(actorId, target, otherEnabledAdmins);

    await this.userRepo.delete(targetId);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.user.delete',
      ip,
    });
  }
}
