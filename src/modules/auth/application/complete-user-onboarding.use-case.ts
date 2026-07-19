import type { UserRepository } from '../domain/ports/user.repository';
import type { SafeUser } from '../domain/user.entity';
import { toSafeUser } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class CompleteUserOnboardingUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    if (user.IsOnboarded) {
      return toSafeUser(user);
    }

    const updated = await this.userRepo.setOnboarded(userId, true);
    return toSafeUser(updated);
  }
}
