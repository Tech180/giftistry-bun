import type { NotificationPrefs } from '../interfaces/notification-prefs.interface';
import { NOTIFICATION_TYPE_PREF_GATE } from '../constants/notification-type-pref-gate.constant';

/**
 * Whether an in-app notification of this type should be created for the user.
 * Marketing is email-only and never creates in-app notifications.
 */
export function shouldCreateNotification(type: string, prefs: NotificationPrefs): boolean {
  const gate = NOTIFICATION_TYPE_PREF_GATE[type];
  if (!gate) {
    return true;
  }
  return prefs[gate] !== false;
}
