import type { CommentRepository } from '../../domain/ports/comment.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { Comment } from '../../domain/interfaces/comment.interface';
import { AppError } from '@/common/domain/errors/app-error';
import { canUserViewComment } from '../../domain/utils/can-user-view-comment.util';

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
