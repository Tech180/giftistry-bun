import type { UserRepository } from '../domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';

export class DisableAccountUseCase {
  constructor(
    private userRepo: UserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(userId: string, isOwner: boolean, ip?: string | null): Promise<void> {
    if (isOwner) {
      throw new AppError('Cannot disable the server owner. Transfer ownership or delete the server first.', 400, 'BAD_REQUEST');
    }

    const target = await this.userRepo.getAccountStatusForDisable(userId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (target.isAdmin && !target.isDisabled) {
      const others = await this.userRepo.countEnabledAdmins(userId);
      if (others === 0) {
        throw new AppError('Cannot disable the last administrator', 400, 'BAD_REQUEST');
      }
    }

    await this.userRepo.disableAccount(userId);

    await this.writeAuditLog.execute({
      actorId: userId,
      targetId: userId,
      action: 'auth.account.disable',
      ip,
    });
  }
}
