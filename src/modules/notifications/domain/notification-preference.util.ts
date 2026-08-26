import type { NotificationPrefs } from './notification.entity';

/**
 * Whether an in-app notification of this type should be created for the user.
 * Marketing is email-only and never creates in-app notifications.
 */
export function shouldCreateNotification(type: string, prefs: NotificationPrefs): boolean {
  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return prefs.FriendRequests !== false;
    case 'list_shared':
    case 'list_share':
    case 'list_invite':
    case 'invite_accepted':
      return prefs.ListShares !== false;
    case 'item_claimed':
    case 'item_deleted':
      return prefs.ItemClaims !== false;
    case 'comment':
      return prefs.Comments !== false;
    case 'job_completed':
    case 'job_failed':
      return prefs.JobCompletions !== false;
    case 'system':
      return true;
    default:
      return true;
  }
}
