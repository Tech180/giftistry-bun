import type { NotificationPrefsUpdate } from '../../domain/types/notification-prefs-update.type';
import type { NotificationPrefsRequest } from '../interfaces/notification-prefs-request.interface';

export function mapNotificationPrefsPayload(
  raw: NotificationPrefsRequest
): NotificationPrefsUpdate {
  return {
    EmailAlerts: raw.EmailAlerts,
    Marketing: raw.Marketing,
    FriendRequests: raw.FriendRequests,
    ListShares: raw.ListShares,
    ItemClaims: raw.ItemClaims,
    Comments: raw.Comments,
    JobCompletions: raw.JobCompletions,
    PushAlerts: raw.PushAlerts,
  };
}
