import { sql } from '@/common/database';
import type { Notification } from '../../domain/interfaces/notification.interface';
import type { NotificationPrefs } from '../../domain/interfaces/notification-prefs.interface';
import type { NotificationPrefsUpdate } from '../../domain/types/notification-prefs-update.type';
import type { NotificationRepository } from '../../domain/ports/notification.repository';
import { LIST_NOTIFICATIONS_LIMIT } from '../constants/list-notifications-limit.constant';
import { NOTIFICATION_PREFS_SELECT } from '../constants/notification-prefs-select.constant';
import { NOTIFICATION_SELECT } from '../constants/notification-select.constant';
import type { NotificationPrefsRow } from '../interfaces/notification-prefs-row.interface';
import type { NotificationRow } from '../interfaces/notification-row.interface';
import { mapNotificationPrefsRow } from '../utils/map-notification-prefs-row.util';
import { mapNotificationRow } from '../utils/map-notification-row.util';

export class PostgresNotificationRepository implements NotificationRepository {
  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Notification> {
    const [row] = await sql<NotificationRow[]>`
      INSERT INTO notifications (user_id, type, title, body, metadata)
      VALUES (${userId}, ${type}, ${title}, ${body}, ${sql.json(metadata as never)})
      RETURNING ${sql.unsafe(NOTIFICATION_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to create notification');
    }
    return mapNotificationRow(row);
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const rows = await sql<NotificationRow[]>`
      SELECT ${sql.unsafe(NOTIFICATION_SELECT)}
      FROM notifications
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${LIST_NOTIFICATIONS_LIMIT}
    `;
    return rows.map(mapNotificationRow);
  }

  async findById(id: string): Promise<Notification | null> {
    const [row] = await sql<NotificationRow[]>`
      SELECT ${sql.unsafe(NOTIFICATION_SELECT)}
      FROM notifications
      WHERE id = ${id}
    `;
    return row ? mapNotificationRow(row) : null;
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const [row] = await sql<NotificationRow[]>`
      UPDATE notifications
      SET read_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING ${sql.unsafe(NOTIFICATION_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to mark notification as read');
    }
    return mapNotificationRow(row);
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
    const [row] = await sql<NotificationPrefsRow[]>`
      SELECT ${sql.unsafe(NOTIFICATION_PREFS_SELECT)}
      FROM user_notification_prefs
      WHERE user_id = ${userId}
    `;
    if (row) {
      return mapNotificationPrefsRow(row);
    }

    const [created] = await sql<NotificationPrefsRow[]>`
      INSERT INTO user_notification_prefs (user_id)
      VALUES (${userId})
      ON CONFLICT (user_id) DO UPDATE SET user_id = user_notification_prefs.user_id
      RETURNING ${sql.unsafe(NOTIFICATION_PREFS_SELECT)}
    `;
    if (!created) {
      throw new Error('Failed to create notification preferences');
    }
    return mapNotificationPrefsRow(created);
  }

  async updatePrefs(userId: string, updates: NotificationPrefsUpdate): Promise<NotificationPrefs> {
    const current = await this.getPrefs(userId);
    const emailAlerts = updates.EmailAlerts ?? current.EmailAlerts;
    const marketing = updates.Marketing ?? current.Marketing;
    const friendRequests = updates.FriendRequests ?? current.FriendRequests;
    const listShares = updates.ListShares ?? current.ListShares;
    const itemClaims = updates.ItemClaims ?? current.ItemClaims;
    const comments = updates.Comments ?? current.Comments;
    const jobCompletions = updates.JobCompletions ?? current.JobCompletions;
    const pushAlerts = updates.PushAlerts ?? current.PushAlerts;

    const [row] = await sql<NotificationPrefsRow[]>`
      INSERT INTO user_notification_prefs (
        user_id, email_alerts, marketing, friend_requests, list_shares, item_claims, comments,
        job_completions, push_alerts, updated_at
      )
      VALUES (
        ${userId}, ${emailAlerts}, ${marketing}, ${friendRequests}, ${listShares}, ${itemClaims},
        ${comments}, ${jobCompletions}, ${pushAlerts}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email_alerts = ${emailAlerts},
        marketing = ${marketing},
        friend_requests = ${friendRequests},
        list_shares = ${listShares},
        item_claims = ${itemClaims},
        comments = ${comments},
        job_completions = ${jobCompletions},
        push_alerts = ${pushAlerts},
        updated_at = CURRENT_TIMESTAMP
      RETURNING ${sql.unsafe(NOTIFICATION_PREFS_SELECT)}
    `;
    if (!row) {
      throw new Error('Failed to update notification preferences');
    }
    return mapNotificationPrefsRow(row);
  }
}
