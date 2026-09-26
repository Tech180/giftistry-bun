import type { UserRepository } from '../../../domain/ports/user.repository';
import type { SafeUser } from '../../../domain/types/safe-user.type';
import { toSafeUser } from '../../../domain/utils/to-safe-user.util';
import { AppError } from '@/common/domain/errors/app-error';
import type { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import { validatePasswordPolicy } from '@/common/domain/utils/validate-password-policy.util';

export class ChangePasswordUseCase {
  constructor(
    private userRepo: UserRepository,
    private getSitePolicy: GetSitePolicyUseCase
  ) {}

  async execute(userId: string, currentPassword: string, newPassword: string): Promise<SafeUser> {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400, 'BAD_REQUEST');
    }

    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from the current password', 400, 'BAD_REQUEST');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const isMatch = await Bun.password.verify(currentPassword, user.AuthHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401, 'UNAUTHORIZED');
    }

    const sitePolicy = await this.getSitePolicy.execute();
    validatePasswordPolicy(newPassword, { requireStrong: sitePolicy.RequireStrongPasswords });

    const authHash = await Bun.password.hash(newPassword);
    const updated = await this.userRepo.updatePassword(userId, authHash);
    return toSafeUser(updated);
  }
}
