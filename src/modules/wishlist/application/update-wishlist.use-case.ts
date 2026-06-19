import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { Wishlist } from '../domain/wishlist.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class UpdateWishlistUseCase {
  constructor(private wishlistRepo: WishlistRepository) {}

  async execute(listId: string, title: string, expiresAtStr?: string | null, allowGroupFunds: boolean = false, category?: string): Promise<Wishlist> {
    if (!title) {
      throw new AppError('Wishlist title is required', 400, 'BAD_REQUEST');
    }

    const existing = await this.wishlistRepo.findById(listId);
    if (!existing) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    let expiresAt: Date | null = null;
    if (expiresAtStr) {
      expiresAt = new Date(expiresAtStr);
      if (isNaN(expiresAt.getTime())) {
        throw new AppError('Invalid expiration date format', 400, 'BAD_REQUEST');
      }
    }

    return await this.wishlistRepo.update(listId, title, expiresAt, allowGroupFunds, category);
  }
}
