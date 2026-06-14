import type { CommentRepository } from '../domain/ports/comment.repository';
import type { Comment } from '../domain/comment.entity';
import { sql } from '@/common/database/connection';

export class PostgresCommentRepository implements CommentRepository {
  async create(
    listId: string,
    userId: string | null,
    commenterName: string,
    content: string,
    isOwnerVisible: boolean,
    isRollover: boolean
  ): Promise<Comment> {
    const [row] = await sql<any[]>`
      INSERT INTO comments (list_id, user_id, commenter_name, content, is_owner_visible, is_rollover)
      VALUES (${listId}, ${userId}, ${commenterName}, ${content}, ${isOwnerVisible}, ${isRollover})
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", commenter_name as "CommenterName", 
                content as "Content", is_owner_visible as "IsOwnerVisible", is_rollover as "IsRollover", 
                created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to create comment');
    return {
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      CommenterName: row.CommenterName,
      Content: row.Content,
      IsOwnerVisible: row.IsOwnerVisible,
      IsRollover: row.IsRollover,
      CreatedAt: new Date(row.CreatedAt),
    };
  }

  async findByListId(listId: string): Promise<Comment[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", commenter_name as "CommenterName", 
             content as "Content", is_owner_visible as "IsOwnerVisible", is_rollover as "IsRollover", 
             created_at as "CreatedAt"
      FROM comments
      WHERE list_id = ${listId}
      ORDER BY created_at ASC
    `;
    return rows.map(row => ({
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      CommenterName: row.CommenterName,
      Content: row.Content,
      IsOwnerVisible: row.IsOwnerVisible,
      IsRollover: row.IsRollover,
      CreatedAt: new Date(row.CreatedAt),
    }));
  }
}
