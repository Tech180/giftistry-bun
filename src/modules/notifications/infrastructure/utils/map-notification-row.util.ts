import type { Notification } from '../../domain/interfaces/notification.interface';
import type { NotificationRow } from '../interfaces/notification-row.interface';

export function mapNotificationRow(row: NotificationRow): Notification {
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
