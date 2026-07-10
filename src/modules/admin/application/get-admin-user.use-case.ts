import type { AdminUserRepository } from '../domain/ports/admin-user.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class GetAdminUserUseCase {
  constructor(private adminUserRepo: AdminUserRepository) {}

  async execute(id: string) {
    const result = await this.adminUserRepo.findByIdWithDetails(id);
    if (!result) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return {
      User: result.user,
      Activity: result.activity,
    };
  }
}
