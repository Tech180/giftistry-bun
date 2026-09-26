import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { BackgroundJobRepository } from '@/modules/jobs';
import { AppError } from '@/common/domain/errors/app-error';

export class DeleteWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private jobRepo?: BackgroundJobRepository
  ) {}

  async execute(listId: string): Promise<void> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }
    if (this.jobRepo) {
      await this.jobRepo.cancelActiveByListId(listId);
    }
    await this.wishlistRepo.delete(listId);
  }
}
