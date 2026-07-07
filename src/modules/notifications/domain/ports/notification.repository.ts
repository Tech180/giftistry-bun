import type { Notification, NotificationPrefs, NotificationPrefsUpdate } from '../notification.entity';

export interface NotificationRepository {
  create(userId: string, type: string, title: string, body: string, metadata?: Record<string, unknown>): Promise<Notification>;
  findByUserId(userId: string): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  markRead(id: string, userId: string): Promise<Notification>;
  markAllRead(userId: string): Promise<void>;
  deleteById(id: string, userId: string): Promise<void>;
  deleteAll(userId: string): Promise<void>;
  getPrefs(userId: string): Promise<NotificationPrefs>;
  updatePrefs(userId: string, updates: NotificationPrefsUpdate): Promise<NotificationPrefs>;
}
