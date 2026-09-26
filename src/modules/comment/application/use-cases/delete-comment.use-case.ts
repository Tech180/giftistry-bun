import type { CommentRepository } from '../../domain/ports/comment.repository';
import type { CommentRealtimePublisher } from '../../domain/ports/comment-realtime-publisher.port';

export class DeleteCommentUseCase {
  constructor(
    private commentRepo: CommentRepository,
    private commentRealtime: CommentRealtimePublisher
  ) {}

  async execute(commentId: string, userId: string): Promise<boolean> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) return false;
    const deleted = await this.commentRepo.deleteByIdAndUserId(commentId, userId);
    if (deleted) {
      this.commentRealtime.publish(comment.ListId, 'comment.deleted', { CommentId: commentId });
    }
    return deleted;
  }
}
