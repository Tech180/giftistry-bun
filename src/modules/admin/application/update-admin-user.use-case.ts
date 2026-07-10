import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AppError } from '@/common/middlewares/error.middleware';

export interface UpdateAdminUserPayload {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string | null;
  emailVerified?: boolean;
}

export class UpdateAdminUserUseCase {
  constructor(
    private adminUserRepo: AdminUserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, id: string, updates: UpdateAdminUserPayload, ip?: string | null) {
    const current = await this.adminUserRepo.getProfileState(id);
    if (!current) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (updates.email) {
      const dup = await this.adminUserRepo.existsByEmail(updates.email, id);
      if (dup) throw new AppError('Email already in use', 409, 'CONFLICT');
    }
    if (updates.username) {
      const dup = await this.adminUserRepo.existsByUsername(updates.username, id);
      if (dup) throw new AppError('Username already in use', 409, 'CONFLICT');
    }

    await this.adminUserRepo.updateProfile(id, updates, current);

    await this.writeAuditLog.execute({
      actorId,
      targetId: id,
      action: 'admin.user.update',
      metadata: updates,
      ip,
    });
  }
}
