import type { CommentRepository } from '../domain/ports/comment.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { Comment } from '../domain/comment.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserViewComment } from '../domain/comment-visibility.service';

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
    const hasExpired = wishlist.ExpiresAt ? new Date() > wishlist.ExpiresAt : false;

    return comments.filter((comment) =>
      canUserViewComment({
        comment,
        viewerUserId: currentUserId,
        wishlistOwnerId: wishlist.UserId,
        hasExpired,
      })
    );
  }
}
