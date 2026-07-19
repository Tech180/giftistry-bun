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
    isRollover: boolean,
    parentId?: string | null,
    imageUrl?: string | null
  ): Promise<Comment> {
    const [row] = await sql<any[]>`
      INSERT INTO comments (list_id, user_id, commenter_name, content, is_owner_visible, is_rollover, parent_id, image_url)
      VALUES (${listId}, ${userId}, ${commenterName}, ${content}, ${isOwnerVisible}, ${isRollover}, ${parentId || null}, ${imageUrl || null})
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", commenter_name as "CommenterName", 
                content as "Content", is_owner_visible as "IsOwnerVisible", is_rollover as "IsRollover", 
                is_deleted as "IsDeleted", parent_id as "ParentId", image_url as "ImageUrl", created_at as "CreatedAt"
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
      IsDeleted: row.IsDeleted,
      ParentId: row.ParentId,
      ImageUrl: row.ImageUrl,
      CreatedAt: new Date(row.CreatedAt),
      Reactions: [],
    };
  }

  async findByListId(listId: string): Promise<Comment[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", commenter_name as "CommenterName", 
             content as "Content", is_owner_visible as "IsOwnerVisible", is_rollover as "IsRollover", 
             is_deleted as "IsDeleted", parent_id as "ParentId", image_url as "ImageUrl", created_at as "CreatedAt"
      FROM comments
      WHERE list_id = ${listId}
      ORDER BY created_at ASC
    `;

    if (rows.length === 0) return [];

    const commentIds = rows.map(r => r.Id);
    const reactions = await sql<any[]>`
      SELECT comment_id as "CommentId", user_id as "UserId", username as "Username", reaction as "Reaction"
      FROM comment_reactions
      WHERE comment_id IN ${sql(commentIds)}
    `;

    const reactionMap: Record<string, any[]> = {};
    for (const rx of reactions) {
      const list = reactionMap[rx.CommentId] ?? [];
      list.push({
        userId: rx.UserId,
        username: rx.Username,
        reaction: rx.Reaction,
      });
      reactionMap[rx.CommentId] = list;
    }

    return rows.map(row => ({
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      CommenterName: row.CommenterName,
      Content: row.Content,
      IsOwnerVisible: row.IsOwnerVisible,
      IsRollover: row.IsRollover,
      IsDeleted: row.IsDeleted,
      ParentId: row.ParentId,
      ImageUrl: row.ImageUrl,
      CreatedAt: new Date(row.CreatedAt),
      Reactions: reactionMap[row.Id] || [],
    }));
  }

  async findById(commentId: string): Promise<Comment | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", commenter_name as "CommenterName", 
             content as "Content", is_owner_visible as "IsOwnerVisible", is_rollover as "IsRollover", 
             is_deleted as "IsDeleted", parent_id as "ParentId", image_url as "ImageUrl", created_at as "CreatedAt"
      FROM comments
      WHERE id = ${commentId}
    `;
    if (!row) return null;

    const reactions = await sql<any[]>`
      SELECT user_id as "UserId", username as "Username", reaction as "Reaction"
      FROM comment_reactions
      WHERE comment_id = ${commentId}
    `;

    return {
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      CommenterName: row.CommenterName,
      Content: row.Content,
      IsOwnerVisible: row.IsOwnerVisible,
      IsRollover: row.IsRollover,
      IsDeleted: row.IsDeleted,
      ParentId: row.ParentId,
      ImageUrl: row.ImageUrl,
      CreatedAt: new Date(row.CreatedAt),
      Reactions: reactions.map(rx => ({
        userId: rx.UserId,
        username: rx.Username,
        reaction: rx.Reaction,
      })),
    };
  }

  async toggleReaction(
    commentId: string,
    userId: string,
    username: string,
    reaction: string
  ): Promise<{ added: boolean }> {
    const [existing] = await sql<any[]>`
      SELECT id FROM comment_reactions
      WHERE comment_id = ${commentId} AND user_id = ${userId} AND reaction = ${reaction}
    `;

    if (existing) {
      await sql`
        DELETE FROM comment_reactions
        WHERE comment_id = ${commentId} AND user_id = ${userId} AND reaction = ${reaction}
      `;
      return { added: false };
    } else {
      await sql`
        INSERT INTO comment_reactions (comment_id, user_id, username, reaction)
        VALUES (${commentId}, ${userId}, ${username}, ${reaction})
      `;
      return { added: true };
    }
  }

  async deleteByIdAndUserId(commentId: string, userId: string): Promise<boolean> {
    const result = await sql`
      UPDATE comments
      SET is_deleted = TRUE, content = 'Comment was deleted.'
      WHERE id = ${commentId} AND user_id = ${userId}
    `;
    return result.count > 0;
  }
}
