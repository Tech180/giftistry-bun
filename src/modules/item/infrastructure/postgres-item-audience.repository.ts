import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { ItemAudienceUser } from '../domain/item-audience.entity';
import { sql } from '@/common/database/connection';

export class PostgresItemAudienceRepository implements ItemAudienceRepository {
  async findByListId(listId: string): Promise<Map<string, ItemAudienceUser[]>> {
    const rows = await sql<any[]>`
      SELECT ia.item_id as "ItemId",
             u.id as "UserId",
             u.username as "Username",
             u.first_name as "FirstName",
             u.last_name as "LastName",
             u.email as "Email"
      FROM item_audiences ia
      JOIN items i ON ia.item_id = i.id
      JOIN users u ON ia.user_id = u.id
      WHERE i.list_id = ${listId}
      ORDER BY ia.created_at ASC
    `;

    const map = new Map<string, ItemAudienceUser[]>();
    for (const row of rows) {
      const audience = map.get(row.ItemId) ?? [];
      audience.push(this.mapUser(row));
      map.set(row.ItemId, audience);
    }
    return map;
  }

  async findByItemId(itemId: string): Promise<ItemAudienceUser[]> {
    const rows = await sql<any[]>`
      SELECT u.id as "UserId",
             u.username as "Username",
             u.first_name as "FirstName",
             u.last_name as "LastName",
             u.email as "Email"
      FROM item_audiences ia
      JOIN users u ON ia.user_id = u.id
      WHERE ia.item_id = ${itemId}
      ORDER BY ia.created_at ASC
    `;
    return rows.map(row => this.mapUser(row));
  }

  async setAudience(itemId: string, userIds: string[]): Promise<ItemAudienceUser[]> {
    await sql`DELETE FROM item_audiences WHERE item_id = ${itemId}`;

    if (userIds.length === 0) {
      return [];
    }

    for (const userId of userIds) {
      await sql`
        INSERT INTO item_audiences (item_id, user_id)
        VALUES (${itemId}, ${userId})
        ON CONFLICT (item_id, user_id) DO NOTHING
      `;
    }

    return this.findByItemId(itemId);
  }

  async deleteByItemId(itemId: string): Promise<void> {
    await sql`DELETE FROM item_audiences WHERE item_id = ${itemId}`;
  }

  async deleteByListIdAndUserId(listId: string, userId: string): Promise<void> {
    await sql`
      DELETE FROM item_audiences ia
      USING items i
      WHERE ia.item_id = i.id
        AND i.list_id = ${listId}
        AND ia.user_id = ${userId}
    `;
  }

  private mapUser(row: any): ItemAudienceUser {
    return {
      UserId: row.UserId,
      Username: row.Username ?? null,
      FirstName: row.FirstName ?? null,
      LastName: row.LastName ?? null,
      Email: row.Email ?? null,
    };
  }
}
