import type { NotificationPrefs } from '../interfaces/notification-prefs.interface';

/** Pref keys that gate in-app notification creation (Marketing is email-only). */
export type NotificationPrefGateKey = keyof Pick<
  NotificationPrefs,
  'FriendRequests' | 'ListShares' | 'ItemClaims' | 'Comments' | 'JobCompletions'
>;
