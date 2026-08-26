import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { validateUsernamePolicy } from '@/common/domain/username-policy';
import { assertCanMutateAdminUser } from './assert-can-mutate-admin-user';

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

    assertCanMutateAdminUser(actorId, id, current.is_owner);

    const nextUpdates = { ...updates };

    if (updates.email) {
      const dup = await this.adminUserRepo.existsByEmail(updates.email, id);
      if (dup) throw new AppError('Email already in use', 409, 'CONFLICT');
    }
    if (nextUpdates.username !== undefined) {
      const trimmed = nextUpdates.username.trim();
      if (trimmed !== current.username) {
        const validatedUsername = validateUsernamePolicy(nextUpdates.username);
        const dup = await this.adminUserRepo.existsByUsername(validatedUsername, id);
        if (dup) throw new AppError('Username already in use', 409, 'CONFLICT');
        nextUpdates.username = validatedUsername;
      } else {
        nextUpdates.username = current.username;
      }
    }

    await this.adminUserRepo.updateProfile(id, nextUpdates, current);

    await this.writeAuditLog.execute({
      actorId,
      targetId: id,
      action: 'admin.user.update',
      metadata: nextUpdates,
      ip,
    });
  }
}
