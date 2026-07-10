import type { UserRepository } from '../domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';

export class DeleteAccountUseCase {
  constructor(
    private userRepo: UserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(userId: string, isOwner: boolean, password: string, ip?: string | null): Promise<void> {
    if (isOwner) {
      throw new AppError('Cannot delete the server owner. Transfer ownership or delete the server first.', 400, 'BAD_REQUEST');
    }

    if (!password) {
      throw new AppError('Password is required', 400, 'BAD_REQUEST');
    }

    const target = await this.userRepo.getAccountStatusForDelete(userId);
    if (!target) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const isMatch = await Bun.password.verify(password, target.authHash);
    if (!isMatch) {
      throw new AppError('Invalid password', 401, 'UNAUTHORIZED');
    }

    if (target.isAdmin && !target.isDisabled) {
      const others = await this.userRepo.countEnabledAdmins(userId);
      if (others === 0) {
        throw new AppError('Cannot delete the last administrator', 400, 'BAD_REQUEST');
      }
    }

    await this.writeAuditLog.execute({
      actorId: userId,
      targetId: userId,
      action: 'auth.account.delete',
      ip,
    });

    await this.userRepo.deleteAccount(userId);
  }
}
