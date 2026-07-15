import type { NotificationRepository } from '../domain/ports/notification.repository';
import type { Notification, NotificationPrefs, NotificationPrefsUpdate } from '../domain/notification.entity';
import { sql } from '@/common/database/connection';

export class PostgresNotificationRepository implements NotificationRepository {
  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Notification> {
    const [row] = await sql<any[]>`
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES (${userId}, ${type}, ${title}, ${body}, ${sql.json(metadata as any)})
      RETURNING id as "Id", user_id as "UserId", type as "Type", title as "Title", body as "Message",
                metadata as "Metadata", read_at as "ReadAt", created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to create notification');
    return this.mapNotification(row);
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", type as "Type", title as "Title", body as "Message",
             metadata as "Metadata", read_at as "ReadAt", created_at as "CreatedAt"
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return rows.map(row => this.mapNotification(row));
  }

  async findById(id: string): Promise<Notification | null> {
    const [row] = await sql<any[]>`
      SELECT id as "Id", user_id as "UserId", type as "Type", title as "Title", body as "Message",
             metadata as "Metadata", read_at as "ReadAt", created_at as "CreatedAt"
      FROM notifications
      WHERE id = ${id}
    `;
    return row ? this.mapNotification(row) : null;
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const [row] = await sql<any[]>`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id as "Id", user_id as "UserId", type as "Type", title as "Title", body as "Message",
                metadata as "Metadata", read_at as "ReadAt", created_at as "CreatedAt"
    `;
    if (!row) throw new Error('Failed to mark notification as read');
    return this.mapNotification(row);
  }

  async markAllRead(userId: string): Promise<void> {
    await sql`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId} AND read_at IS NULL
    `;
  }

  async deleteById(id: string, userId: string): Promise<void> {
    await sql`DELETE FROM notifications WHERE id = ${id} AND user_id = ${userId}`;
  }

  async deleteAll(userId: string): Promise<void> {
    await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
  }

  async getPrefs(userId: string): Promise<NotificationPrefs> {
    const [row] = await sql<any[]>`
      SELECT user_id as "UserId", email_alerts as "EmailAlerts", marketing as "Marketing",
             friend_requests as "FriendRequests", list_shares as "ListShares",
             item_claims as "ItemClaims", comments as "Comments",
             updated_at as "UpdatedAt"
      FROM user_notification_prefs
      WHERE user_id = ${userId}
    `;
    if (row) {
      return this.mapPrefs(row);
    }

    const [created] = await sql<any[]>`
      INSERT INTO user_notification_prefs (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO UPDATE SET user_id = user_notification_prefs.user_id
      RETURNING user_id as "UserId", email_alerts as "EmailAlerts", marketing as "Marketing",
                friend_requests as "FriendRequests", list_shares as "ListShares",
                item_claims as "ItemClaims", comments as "Comments",
                updated_at as "UpdatedAt"
    `;
    return this.mapPrefs(created);
  }

  async updatePrefs(userId: string, updates: NotificationPrefsUpdate): Promise<NotificationPrefs> {
    const current = await this.getPrefs(userId);
    const emailAlerts = updates.EmailAlerts ?? current.EmailAlerts;
    const marketing = updates.Marketing ?? current.Marketing;
    const friendRequests = updates.FriendRequests ?? current.FriendRequests;
    const listShares = updates.ListShares ?? current.ListShares;
    const itemClaims = updates.ItemClaims ?? current.ItemClaims;
    const comments = updates.Comments ?? current.Comments;

    const [row] = await sql<any[]>`
      INSERT INTO user_notification_prefs (
        user_id, email_alerts, marketing, friend_requests, list_shares, item_claims, comments, updated_at
      )
      VALUES (
        ${userId}, ${emailAlerts}, ${marketing}, ${friendRequests}, ${listShares}, ${itemClaims}, ${comments}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email_alerts = ${emailAlerts},
        marketing = ${marketing},
        friend_requests = ${friendRequests},
        list_shares = ${listShares},
        item_claims = ${itemClaims},
        comments = ${comments},
        updated_at = CURRENT_TIMESTAMP
      RETURNING user_id as "UserId", email_alerts as "EmailAlerts", marketing as "Marketing",
                friend_requests as "FriendRequests", list_shares as "ListShares",
                item_claims as "ItemClaims", comments as "Comments",
                updated_at as "UpdatedAt"
    `;
    return this.mapPrefs(row);
  }

  private mapPrefs(row: any): NotificationPrefs {
    return {
      UserId: row.UserId,
      EmailAlerts: row.EmailAlerts,
      Marketing: row.Marketing,
      FriendRequests: row.FriendRequests,
      ListShares: row.ListShares,
      ItemClaims: row.ItemClaims,
      Comments: row.Comments,
      UpdatedAt: new Date(row.UpdatedAt),
    };
  }

  private mapNotification(row: any): Notification {
    return {
      Id: row.Id,
      UserId: row.UserId,
      Type: row.Type,
      Title: row.Title,
      Message: row.Message ?? '',
      Metadata: row.Metadata ?? {},
      ReadAt: row.ReadAt ? new Date(row.ReadAt) : null,
      CreatedAt: new Date(row.CreatedAt),
    };
  }
}
