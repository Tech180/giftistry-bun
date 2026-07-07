import type { CommentRepository } from '../domain/ports/comment.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class ToggleReactionUseCase {
  constructor(private commentRepo: CommentRepository) {}

  async execute(
    commentId: string,
    userId: string,
    username: string,
    reaction: string
  ): Promise<{ added: boolean }> {
    if (!commentId) {
      throw new AppError('Comment ID is required', 400, 'BAD_REQUEST');
    }
    if (!reaction || !reaction.trim()) {
      throw new AppError('Reaction is required', 400, 'BAD_REQUEST');
    }
    return await this.commentRepo.toggleReaction(commentId, userId, username, reaction.trim());
  }
}
