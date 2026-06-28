import type { UserRepository } from '../domain/ports/user.repository';
import type { User } from '../domain/user.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class UpdateProfileUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string, updates: { username?: string; firstName?: string; lastName?: string; bio?: string; theme?: string; avatar?: string | null }): Promise<Omit<User, 'AuthHash'>> {
    if (updates.username) {
      const existingUser = await this.userRepo.findByUsername(updates.username);
      if (existingUser && existingUser.Id !== userId) {
        throw new AppError('Username is already taken', 409, 'USERNAME_TAKEN');
      }
    }

    const user = await this.userRepo.update(userId, updates);
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
    };
  }
}
