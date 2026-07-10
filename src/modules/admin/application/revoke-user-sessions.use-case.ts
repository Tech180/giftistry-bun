import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AppError } from '@/common/middlewares/error.middleware';

export class RevokeUserSessionsUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, targetId: string, ip?: string | null) {
    const exists = await this.adminUserRepo.exists(targetId);
    if (!exists) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    await this.adminUserRepo.revokeSessions(targetId);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.revoke_sessions',
      ip,
    });
  }
}
