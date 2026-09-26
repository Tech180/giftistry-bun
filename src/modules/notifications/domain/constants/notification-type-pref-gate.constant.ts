import type { NotificationPrefGateKey } from '../types/notification-pref-gate-key.type';

/**
 * Notification type → preference field that must be enabled to create in-app.
 * Types omitted here (e.g. `system`) always create.
 */
export const NOTIFICATION_TYPE_PREF_GATE: Record<string, NotificationPrefGateKey> = {
  friend_request: 'FriendRequests',
  friend_accepted: 'FriendRequests',
  list_shared: 'ListShares',
  list_share: 'ListShares',
  list_invite: 'ListShares',
  invite_accepted: 'ListShares',
  item_claimed: 'ItemClaims',
  item_deleted: 'ItemClaims',
  comment: 'Comments',
  job_completed: 'JobCompletions',
  job_failed: 'JobCompletions',
};
