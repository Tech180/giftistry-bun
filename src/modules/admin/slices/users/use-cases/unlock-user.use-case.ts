import type { UserRepository } from '../../../domain/ports/user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { AdminUser } from '../../../domain/admin-user.entity';

export class UnlockUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, targetId: string, ip?: string | null) {
    const target = await this.userRepo.getPolicyState(targetId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    AdminUser.assertCanMutate(actorId, targetId, target.isOwner);

    await this.userRepo.unlock(targetId);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.user.unlock',
      ip,
    });
  }
}
