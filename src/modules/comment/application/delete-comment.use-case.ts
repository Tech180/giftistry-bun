import type { CommentRepository } from '../domain/ports/comment.repository';

export class DeleteCommentUseCase {
  constructor(private commentRepo: CommentRepository) {}

  async execute(commentId: string, userId: string): Promise<boolean> {
    return this.commentRepo.deleteByIdAndUserId(commentId, userId);
  }
}
