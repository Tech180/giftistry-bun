import type { Comment } from '../comment.entity';

export interface CommentRepository {
  create(
    listId: string,
    userId: string | null,
    commenterName: string,
    content: string,
    isOwnerVisible: boolean,
    isRollover: boolean
  ): Promise<Comment>;
  
  findByListId(listId: string): Promise<Comment[]>;
  deleteByIdAndUserId(commentId: string, userId: string): Promise<boolean>;
}
