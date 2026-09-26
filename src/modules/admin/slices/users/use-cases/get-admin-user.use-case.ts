import type { UserRepository } from '../../../domain/ports/user.repository';
import { AppError } from '@/common/domain/errors/app-error';

export class GetAdminUserUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(id: string) {
    const result = await this.userRepo.findByIdWithDetails(id);
    if (!result) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      User: result.user,
      Activity: result.activity,
    };
  }
}
