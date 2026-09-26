import type { UserRepository } from '../../../domain/ports/user.repository';
import { AppError } from '@/common/domain/errors/app-error';
import type { CurrentUser } from '../interfaces/current-user.interface';

export class GetCurrentUserUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string): Promise<CurrentUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('Unauthorized: User not found', 401, 'UNAUTHORIZED');
    }

    if (user.IsDisabled) {
      throw new AppError('Your account has been disabled', 403, 'FORBIDDEN');
    }

    return {
      userId: user.Id,
      email: user.Email,
      Id: user.Id,
      Username: user.Username,
      Email: user.Email,
      FirstName: user.FirstName,
      LastName: user.LastName,
      CreatedAt: user.CreatedAt,
      Bio: user.Bio,
      Theme: user.Theme,
      Avatar: user.Avatar,
      EmailVerified: user.EmailVerified,
      TwoFactorEnabled: user.TwoFactorEnabled,
      IsAdmin: user.IsAdmin,
      IsOwner: user.IsOwner,
      IsDisabled: user.IsDisabled,
      ForcePasswordChange: user.ForcePasswordChange,
      Policy: user.PolicyJson,
      AiEnabled: user.AiEnabled !== false,
      WebSearchEnabled: user.WebSearchEnabled !== false,
      IsOnboarded: user.IsOnboarded === true,
      Tour: user.Tour,
    };
  }
}
