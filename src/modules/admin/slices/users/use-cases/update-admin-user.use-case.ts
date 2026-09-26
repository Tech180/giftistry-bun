import type { UserRepository } from '../../../domain/ports/user.repository';
import type { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { AppError } from '@/common/domain/errors/app-error';
import { validateUsernamePolicy } from '@/common/domain/utils/validate-username-policy.util';
import { AdminUser } from '../../../domain/admin-user.entity';
import type { UpdateUserPayload } from '../interfaces/update-user-payload.interface';

export class UpdateAdminUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private writeAuditLog: WriteAuditLogUseCase
  ) {}

  async execute(actorId: string, id: string, updates: UpdateUserPayload, ip?: string | null) {
    const current = await this.userRepo.getProfileState(id);
    if (!current) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    AdminUser.assertCanMutate(actorId, id, current.is_owner);

    const nextUpdates = { ...updates };

    if (updates.email) {
      const dup = await this.userRepo.existsByEmail(updates.email, id);
      if (dup) throw new AppError('Email already in use', 409, 'CONFLICT');
    }
    if (nextUpdates.username !== undefined) {
      const trimmed = nextUpdates.username.trim();
      if (trimmed !== current.username) {
        const validatedUsername = validateUsernamePolicy(nextUpdates.username);
        const dup = await this.userRepo.existsByUsername(validatedUsername, id);
        if (dup) throw new AppError('Username already in use', 409, 'CONFLICT');
        nextUpdates.username = validatedUsername;
      } else {
        nextUpdates.username = current.username;
      }
    }

    await this.userRepo.updateProfile(id, nextUpdates, current);

    await this.writeAuditLog.execute({
      actorId,
      targetId: id,
      action: 'admin.user.update',
      metadata: nextUpdates,
      ip,
    });
  }
}
