import type { CommentRepository } from '@/modules/comment/domain/ports/comment.repository';
import type { CommentRealtimePublisher } from '@/modules/comment/domain/ports/comment-realtime-publisher.port';

export const GROUP_FUND_SYSTEM_COMMENTER_NAME = 'System';

export interface PostGroupFundCommentInput {
  listId: string;
  itemId: string;
  itemName: string;
  amount: number;
  isStart: boolean;
}

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

    const comment = await this.commentRepo.create(
      input.listId,
      null,
      GROUP_FUND_SYSTEM_COMMENTER_NAME,
      content,
      false,
      false,
      null,
      null
    );

    this.commentRealtime.publish(input.listId, 'comment.created', { Comment: comment });
  }
}
