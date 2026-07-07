import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { GrantedVia, ListShare, ListShareWithUser, ListRole, ShareRole } from '../domain/list-share.entity';
import { sql } from '@/common/database/connection';

export class PostgresListShareRepository implements ListShareRepository {
  async addShare(
    listId: string,
    userId: string,
    role: ShareRole,
    grantedVia: GrantedVia = 'direct'
  ): Promise<ListShare> {
    const [row] = await sql<any[]>`
      INSERT INTO list_shares (list_id, user_id, role, granted_via)
      VALUES (${listId}, ${userId}, ${role}, ${grantedVia})
      ON CONFLICT (list_id, user_id) DO UPDATE SET role = ${role}, granted_via = ${grantedVia}
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
                granted_via as "GrantedVia", created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to create or update list share');
    }
    return this.mapShare(row);
  }

  async getRole(listId: string, userId: string): Promise<ListRole | null> {
    const [list] = await sql<any[]>`
      SELECT user_id as "userId" FROM lists WHERE id = ${listId}
    `;
    if (list && list.userId === userId) {
      return 'owner';
    }

    const [share] = await sql<any[]>`
      SELECT role as "role" FROM list_shares WHERE list_id = ${listId} AND user_id = ${userId}
    `;
    if (share) {
      return share.role as ListRole;
    }

    return null;
  }

  async findListIdByItemId(itemId: string): Promise<string | null> {
    const [item] = await sql<any[]>`
      SELECT list_id as "listId" FROM items WHERE id = ${itemId}
    `;
    return item ? item.listId : null;
  }

  async findSharesByListId(listId: string): Promise<ListShare[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
             granted_via as "GrantedVia", created_at as "CreatedAt"
      FROM list_shares
      WHERE list_id = ${listId}
    `;
    return rows.map(row => this.mapShare(row));
  }

  async findShareById(shareId: string): Promise<ListShare | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
             granted_via as "GrantedVia", created_at as "CreatedAt"
      FROM list_shares
      WHERE id = ${shareId}
    `;
    return row ? this.mapShare(row) : null;
  }

  async findSharesWithUsers(listId: string): Promise<ListShareWithUser[]> {
    const rows = await sql<any[]>`
      SELECT ls.id as "Id", ls.list_id as "ListId", ls.user_id as "UserId", ls.role as "Role",
             ls.granted_via as "GrantedVia", ls.created_at as "CreatedAt",
             u.username as "Username", u.first_name as "FirstName", u.last_name as "LastName",
             u.email as "Email", u.avatar as "Avatar"
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ${listId}
      ORDER BY ls.created_at ASC
    `;
    return rows.map(row => ({
      ...this.mapShare(row),
      Username: row.Username,
      FirstName: row.FirstName,
      LastName: row.LastName,
      Email: row.Email,
      Avatar: row.Avatar ?? null,
    }));
  }

  async updateShareRole(shareId: string, role: ShareRole): Promise<ListShare> {
    const [row] = await sql<any[]>`
      UPDATE list_shares
      SET role = ${role}
      WHERE id = ${shareId}
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
                granted_via as "GrantedVia", created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to update list share role');
    }
    return this.mapShare(row);
  }

  async removeShare(shareId: string): Promise<void> {
    await sql`DELETE FROM list_shares WHERE id = ${shareId}`;
  }

  private mapShare(row: any): ListShare {
    return {
      Id: row.Id,
      ListId: row.ListId,
      UserId: row.UserId,
      Role: row.Role as ShareRole,
      GrantedVia: row.GrantedVia as GrantedVia | undefined,
      CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
    };
  }
}
