import type { Comment } from '../interfaces/comment.interface';
import type { CreateCommentInput } from '../interfaces/create-comment-input.interface';

export interface CommentRepository {
  create(input: CreateCommentInput): Promise<Comment>;
  findByListId(listId: string): Promise<Comment[]>;
  findById(commentId: string): Promise<Comment | null>;
  deleteByIdAndUserId(commentId: string, userId: string): Promise<boolean>;
  toggleReaction(
    commentId: string,
    userId: string,
    username: string,
    reaction: string
  ): Promise<{ added: boolean }>;
}
