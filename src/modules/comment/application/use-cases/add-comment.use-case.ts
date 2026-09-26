import type { CommentRepository } from '../../domain/ports/comment.repository';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ListShareRepository } from '@/modules/wishlist';
import type { Comment } from '../../domain/interfaces/comment.interface';
import { CommentEntity } from '../../domain/comment.entity';
import { WishlistEntity } from '@/modules/wishlist';
import { AppError } from '@/common/domain/errors/app-error';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { CommentRealtimePublisher } from '../../domain/ports/comment-realtime-publisher.port';
import { validateMentionsInAudience } from '../../domain/utils/validate-mentions-in-audience.util';
import { validateVisibilityPayload } from '../../domain/utils/validate-visibility-payload.util';

export class AddCommentUseCase {
  constructor(
    private commentRepo: CommentRepository,
    private wishlistRepo: WishlistRepository,
    private assertUserCan: AssertUserCanUseCase,
    private listShareRepo: ListShareRepository,
    private commentRealtime: CommentRealtimePublisher
  ) {}

  async execute(
    listId: string,
    userId: string | null,
    commenterName: string,
    content: string,
    isOwnerVisible: boolean = true,
    isRollover: boolean = false,
    parentId?: string | null,
    imageUrl?: string | null,
    visibleToUserIds?: string[] | null
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
      await this.assertUserCan.execute(userId, 'CanUseComments');
      if (imageUrl) {
        await this.assertUserCan.execute(userId, 'CanUploadImages');
      }
    }

    const wishlistEntity = WishlistEntity.from(wishlist);
    const isOwner = userId !== null && wishlistEntity.isOwner(userId);
    const resolvedIsRollover = wishlist.AutoRollover === true && isRollover;

    const shares = await this.listShareRepo.findSharesByListId(listId);
    const allowedParticipantIds = new Set<string>([
      wishlist.UserId,
      ...shares.map((share) => share.UserId),
    ]);

    const visibility = validateVisibilityPayload({
      isOwner,
      isOwnerVisible,
      visibleToUserIds,
      allowedParticipantIds,
    });

    const finalIsOwnerVisible = CommentEntity.from({
      Id: '',
      ListId: listId,
      UserId: userId,
      CommenterName: commenterName,
      Content: content,
      IsOwnerVisible: visibility.isOwnerVisible,
      IsRollover: resolvedIsRollover,
    }).resolveOwnerVisibility(isOwner, visibility.isOwnerVisible);

    validateMentionsInAudience(content, visibility.visibleToUserIds, userId);

    const comment = await this.commentRepo.create({
      listId,
      userId,
      commenterName,
      content,
      isOwnerVisible: finalIsOwnerVisible,
      isRollover: resolvedIsRollover,
      parentId,
      imageUrl,
      visibleToUserIds: visibility.visibleToUserIds,
    });

    this.commentRealtime.publish(listId, 'comment.created', { Comment: comment });

    return comment;
  }
}
