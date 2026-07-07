import type { CommentRepository } from '../domain/ports/comment.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { Comment } from '../domain/comment.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { assertUserCan } from '@/common/services/user-policy.service';

export class AddCommentUseCase {
  constructor(
    private commentRepo: CommentRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(
    listId: string,
    userId: string | null,
    commenterName: string,
    content: string,
    isOwnerVisible: boolean = true,
    isRollover: boolean = false,
    parentId?: string | null,
    imageUrl?: string | null
  ): Promise<Comment> {
    if (!listId) {
      throw new AppError('List ID is required', 400, 'BAD_REQUEST');
    }
    if (!content || !content.trim()) {
      throw new AppError('Comment content cannot be empty', 400, 'BAD_REQUEST');
    }
    if (!commenterName || !commenterName.trim()) {
      throw new AppError('Commenter name is required', 400, 'BAD_REQUEST');
    }

    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    if (userId) {
      await assertUserCan(userId, 'canUseComments');
      if (imageUrl) {
        await assertUserCan(userId, 'canUploadImages');
      }
    }

    // If the commenter is the owner of the list, they can't post a non-owner-visible comment!
    // That would be posting a comment to themselves that they cannot see, which makes no sense.
    const isOwner = userId === wishlist.UserId;
    const finalIsOwnerVisible = isOwner ? true : isOwnerVisible;

    return await this.commentRepo.create(
      listId,
      userId,
      commenterName,
      content,
      finalIsOwnerVisible,
      isRollover,
      parentId,
      imageUrl
    );
  }
}
