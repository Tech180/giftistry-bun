import type { Comment } from '../comment.entity';

export interface CommentRepository {
  create(
    listId: string,
    userId: string | null,
    commenterName: string,
    content: string,
    isOwnerVisible: boolean,
    isRollover: boolean,
    parentId?: string | null,
    imageUrl?: string | null
  ): Promise<Comment>;
  
  findByListId(listId: string): Promise<Comment[]>;
  deleteByIdAndUserId(commentId: string, userId: string): Promise<boolean>;
  toggleReaction(commentId: string, userId: string, username: string, reaction: string): Promise<{ added: boolean }>;
}
