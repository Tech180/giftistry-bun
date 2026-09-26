import type { NotificationPrefs } from '../interfaces/notification-prefs.interface';

export type NotificationPrefsUpdate = Partial<
  Pick<
    NotificationPrefs,
    | 'EmailAlerts'
    | 'Marketing'
    | 'FriendRequests'
    | 'ListShares'
    | 'ItemClaims'
    | 'Comments'
    | 'JobCompletions'
    | 'PushAlerts'
  >
>;
