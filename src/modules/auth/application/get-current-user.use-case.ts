import type { UserRepository } from '../domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export interface CurrentUser {
  userId: string;
  email: string;
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  CreatedAt?: Date;
  Bio?: string;
  Theme?: string;
  Avatar?: string | null;
  EmailVerified?: boolean;
  TwoFactorEnabled?: boolean;
  IsAdmin?: boolean;
  IsOwner?: boolean;
  IsDisabled?: boolean;
  ForcePasswordChange?: boolean;
  Policy?: unknown;
  AiEnabled?: boolean;
}

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
    };
  }
}
