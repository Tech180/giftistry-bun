import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AppError } from '@/common/middlewares/error.middleware';

export interface ResetPasswordPayload {
  password: string;
  forcePasswordChange?: boolean;
}

export class ResetUserPasswordUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, targetId: string, payload: ResetPasswordPayload, ip?: string | null) {
    if (!payload?.password) {
      throw new AppError('Password is required', 400, 'BAD_REQUEST');
    }

    const exists = await this.adminUserRepo.exists(targetId);
    if (!exists) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const authHash = await Bun.password.hash(payload.password);
    await this.adminUserRepo.resetPassword(targetId, authHash, payload.forcePasswordChange ?? false);

    await this.writeAuditLog.execute({
      actorId,
      targetId,
      action: 'admin.reset_password',
      ip,
    });
  }
}
