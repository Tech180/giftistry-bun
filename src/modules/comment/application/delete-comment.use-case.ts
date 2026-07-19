import type { CommentRepository } from '../domain/ports/comment.repository';
import { publishCommentEvent } from '../infrastructure/comment-publisher';

export class DeleteCommentUseCase {
  constructor(private commentRepo: CommentRepository) {}

  async execute(commentId: string, userId: string): Promise<boolean> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) return false;
    const deleted = await this.commentRepo.deleteByIdAndUserId(commentId, userId);
    if (deleted) {
      publishCommentEvent(comment.ListId, 'comment.deleted', { CommentId: commentId });
    }
    return deleted;
  }
}
