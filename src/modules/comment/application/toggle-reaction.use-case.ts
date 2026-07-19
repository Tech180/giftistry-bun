import type { CommentRepository } from '../domain/ports/comment.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import { publishCommentEvent } from '../infrastructure/comment-publisher';

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
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404, 'NOT_FOUND');
    }
    const result = await this.commentRepo.toggleReaction(commentId, userId, username, reaction.trim());
    
    publishCommentEvent(comment.ListId, 'reaction.toggled', {
      CommentId: commentId,
      UserId: userId,
      Username: username,
      Reaction: reaction.trim(),
      Added: result.added,
    });

    return result;
  }
}
