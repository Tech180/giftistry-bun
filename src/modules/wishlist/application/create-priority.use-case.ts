import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Priority } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class CreatePriorityUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(userId: string, label: string, weight: number): Promise<Priority> {
    if (!label) {
      throw new AppError('Priority label is required', 400, 'BAD_REQUEST');
    }
    if (weight === undefined || weight === null || isNaN(weight)) {
      throw new AppError('Priority weight must be a valid number', 400, 'BAD_REQUEST');
    }

    try {
      return await this.wishlistRepo.createPriority(userId, label, weight);
    } catch (error: any) {
      if (error.message && error.message.includes('unique')) {
        throw new AppError('Priority label already exists for this user', 409, 'PRIORITY_EXISTS');
      }
      throw error;
    }
  }
}
