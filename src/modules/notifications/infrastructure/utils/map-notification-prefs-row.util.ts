import type { NotificationPrefs } from '../../domain/interfaces/notification-prefs.interface';
import type { NotificationPrefsRow } from '../interfaces/notification-prefs-row.interface';

export function mapNotificationPrefsRow(row: NotificationPrefsRow): NotificationPrefs {
  return {
    UserId: row.UserId,
    EmailAlerts: row.EmailAlerts,
    Marketing: row.Marketing,
    FriendRequests: row.FriendRequests,
    ListShares: row.ListShares,
    ItemClaims: row.ItemClaims,
    Comments: row.Comments,
    JobCompletions: row.JobCompletions ?? true,
    PushAlerts: row.PushAlerts ?? true,
    UpdatedAt: new Date(row.UpdatedAt),
  };
}
