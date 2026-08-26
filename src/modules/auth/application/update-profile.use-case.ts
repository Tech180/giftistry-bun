import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { mergeUserPolicy } from '@/common/types/user-policy';
import { AppError } from '@/common/middlewares/error.middleware';
import { validateUsernamePolicy } from '@/common/domain/username-policy';

export class UpdateProfileUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, updates: {
    username?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    theme?: string;
    avatar?: string | null;
    aiEnabled?: boolean;
    webSearchEnabled?: boolean;
  }): Promise<Omit<User, 'AuthHash'>> {
    const nextUpdates = { ...updates };

    if (nextUpdates.username !== undefined) {
      const current = await this.userRepo.findById(userId);
      if (!current) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      const trimmed = nextUpdates.username.trim();
      if (trimmed !== current.Username) {
        const validatedUsername = validateUsernamePolicy(nextUpdates.username);
        const existingUser = await this.userRepo.findByUsername(validatedUsername);
        if (existingUser && existingUser.Id !== userId) {
          throw new AppError('Username is already taken', 409, 'USERNAME_TAKEN');
        }
        nextUpdates.username = validatedUsername;
      } else {
        nextUpdates.username = current.Username;
      }
    }

    const user = await this.userRepo.update(userId, nextUpdates);
    return {
      Id: user.Id,
      Username: user.Username,
      Email: user.Email,
      FirstName: user.FirstName,
      LastName: user.LastName,
      CreatedAt: user.CreatedAt,
      Bio: user.Bio,
      Theme: user.Theme,
      Avatar: user.Avatar,
      Birthday: user.Birthday,
      EmailVerified: user.EmailVerified,
      TwoFactorEnabled: user.TwoFactorEnabled,
      IsAdmin: user.IsAdmin,
      IsOwner: user.IsOwner,
      AiEnabled: user.AiEnabled !== false,
      WebSearchEnabled: user.WebSearchEnabled !== false,
      Policy: mergeUserPolicy(user.PolicyJson),
    };
  }
}
