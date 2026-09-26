import type { UserRepository } from '../../../domain/ports/user.repository';
import type { SafeUser } from '../../../domain/types/safe-user.type';
import { toSafeUser } from '../../../domain/utils/to-safe-user.util';
import { AppError } from '@/common/domain/errors/app-error';
import { validateUsernamePolicy } from '@/common/domain/utils/validate-username-policy.util';

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
  }): Promise<SafeUser> {
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
    return toSafeUser(user);
  }
}
