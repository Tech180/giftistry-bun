import type { CommentRepository } from '../domain/ports/comment.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { Comment } from '../domain/comment.entity';
import { AppError } from '@/common/middlewares/error.middleware';

export class ListCommentsUseCase {
  constructor(
    private commentRepo: CommentRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(listId: string, currentUserId: string | null): Promise<Comment[]> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const comments = await this.commentRepo.findByListId(listId);
    const isOwner = currentUserId === wishlist.UserId;
    const hasExpired = wishlist.ExpiresAt ? new Date() > wishlist.ExpiresAt : false;

    // Filter comments: owner cannot see non-owner-visible comments unless expired
    return comments.filter((comment) => {
      if (isOwner && !comment.IsOwnerVisible && !hasExpired) {
        return false;
      }
      return true;
    });
  }
}
