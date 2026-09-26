import type { ListShareRepository } from '../../domain/ports/list-share.repository';
import type { GrantedVia } from '../../domain/types/granted-via.type';
import type { ListShare } from '../../domain/interfaces/list-share.interface';
import type { ListShareWithUser } from '../../domain/interfaces/list-share-with-user.interface';
import type { ListRole } from '../../domain/types/list-role.type';
import type { ShareRole } from '../../domain/types/share-role.type';
import type { ListShareRow } from '../interfaces/list-share-row.interface';
import type { ListShareWithUserRow } from '../interfaces/list-share-with-user-row.interface';
import type { ListOwnerRow } from '../interfaces/list-owner-row.interface';
import type { ShareRoleRow } from '../interfaces/share-role-row.interface';
import type { ItemListIdRow } from '../interfaces/item-list-id-row.interface';
import { sql } from '@/common/database';
import { mapListShareRow } from '../utils/map-list-share-row.util';
import { mapListShareWithUserRow } from '../utils/map-list-share-with-user-row.util';

export class PostgresListShareRepository implements ListShareRepository {
  async addShare(
    listId: string,
    userId: string,
    role: ShareRole,
    grantedVia: GrantedVia = 'direct'
  ): Promise<ListShare> {
    const [row] = await sql<ListShareRow[]>`
      INSERT INTO list_shares (list_id, user_id, role, granted_via)
      VALUES (${listId}, ${userId}, ${role}, ${grantedVia})
      ON CONFLICT (list_id, user_id) DO UPDATE SET role = ${role}, granted_via = ${grantedVia}
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
                granted_via as "GrantedVia", created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to create or update list share');
    }

    return mapListShareRow(row);
  }

  async getRole(listId: string, userId: string): Promise<ListRole | null> {
    const [list] = await sql<ListOwnerRow[]>`
      SELECT user_id as "userId" FROM lists WHERE id = ${listId}
    `;
    if (list && list.userId === userId) {
      return 'owner';
    }

    const [share] = await sql<ShareRoleRow[]>`
      SELECT role as "role" FROM list_shares WHERE list_id = ${listId} AND user_id = ${userId}
    `;
    if (share) {
      return share.role as ListRole;
    }

    return null;
  }

  async findListIdByItemId(itemId: string): Promise<string | null> {
    const [item] = await sql<ItemListIdRow[]>`
      SELECT list_id as "listId" FROM items WHERE id = ${itemId}
    `;
    if (item?.listId) {
      return item.listId;
    }

    const [viaSubstitution] = await sql<ItemListIdRow[]>`
      SELECT i.list_id as "listId"
      FROM item_substitutions s
      JOIN items i ON i.id = s.parent_item_id
      WHERE s.id = ${itemId}
    `;
    return viaSubstitution?.listId ?? null;
  }

  async findSharesByListId(listId: string): Promise<ListShare[]> {
    const rows = await sql<ListShareRow[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
             granted_via as "GrantedVia", created_at as "CreatedAt"
      FROM list_shares
      WHERE list_id = ${listId}
    `;
    return rows.map(mapListShareRow);
  }

  async findShareById(shareId: string): Promise<ListShare | null> {
    const [row] = await sql<ListShareRow[]>`
      SELECT id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
             granted_via as "GrantedVia", created_at as "CreatedAt"
      FROM list_shares
      WHERE id = ${shareId}
    `;
    return row ? mapListShareRow(row) : null;
  }

  async findSharesWithUsers(listId: string): Promise<ListShareWithUser[]> {
    const rows = await sql<ListShareWithUserRow[]>`
      SELECT ls.id as "Id", ls.list_id as "ListId", ls.user_id as "UserId", ls.role as "Role",
             ls.granted_via as "GrantedVia", ls.created_at as "CreatedAt",
             u.username as "Username", u.first_name as "FirstName", u.last_name as "LastName",
             u.email as "Email", u.avatar as "Avatar"
      FROM list_shares ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.list_id = ${listId}
      ORDER BY ls.created_at ASC
    `;
    return rows.map(mapListShareWithUserRow);
  }

  async updateShareRole(shareId: string, role: ShareRole): Promise<ListShare> {
    const [row] = await sql<ListShareRow[]>`
      UPDATE list_shares
      SET role = ${role}
      WHERE id = ${shareId}
      RETURNING id as "Id", list_id as "ListId", user_id as "UserId", role as "Role",
                granted_via as "GrantedVia", created_at as "CreatedAt"
    `;
    if (!row) {
      throw new Error('Failed to update list share role');
    }

    return mapListShareRow(row);
  }

  async removeShare(shareId: string): Promise<void> {
    await sql`DELETE FROM list_shares WHERE id = ${shareId}`;
  }
}
