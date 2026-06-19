import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class DeletePriorityUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    if (!id) {
      throw new AppError('Priority ID is required', 400, 'BAD_REQUEST');
    }

    const priority = await this.wishlistRepo.findPriorityById(id);
    if (!priority) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    if (priority.UserId !== userId) {
      throw new AppError('Forbidden: You do not own this category', 403, 'FORBIDDEN');
    }

    await this.wishlistRepo.deletePriority(id, userId);
  }
}
