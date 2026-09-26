import type { CommentRepository } from '@/modules/comment';
import type { CommentRealtimePublisher } from '@/modules/comment';
import { GROUP_FUND_SYSTEM_COMMENTER_NAME } from '../constants/group-fund-system-commenter-name.constant';
import type { PostGroupFundCommentInput } from '../interfaces/post-group-fund-comment-input.interface';

/**
 * Posts an owner-hidden system comment when group funding starts or receives a contribution.
 * Soft-fails at the caller — claim success must not depend on comment insert.
 */
export class PostGroupFundCommentUseCase {
  constructor(
    private commentRepo: CommentRepository,
    private commentRealtime: CommentRealtimePublisher
  ) {}

  async execute(input: PostGroupFundCommentInput): Promise<void> {
    const itemName = input.itemName.trim() || 'Item';
    const tag = `[${itemName}](item:${input.itemId})`;
    const dollars = `$${Number(input.amount).toFixed(2)}`;
    // Keep the item name in plain prose (tags are stripped from the body for badge display).
    const content = input.isStart
      ? `Group Funding has been started for ${itemName} and has an initial contribution of ${dollars}. Join in! ${tag}`
      : `Group Funding has received a contribution of ${dollars} for ${itemName}. Join in! ${tag}`;

    const comment = await this.commentRepo.create({
      listId: input.listId,
      userId: null,
      commenterName: GROUP_FUND_SYSTEM_COMMENTER_NAME,
      content,
      isOwnerVisible: false,
      isRollover: false,
      parentId: null,
      imageUrl: null,
    });

    this.commentRealtime.publish(input.listId, 'comment.created', { Comment: comment });
  }
}
