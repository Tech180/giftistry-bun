import type { CreateNotificationUseCase } from '../../application/use-cases/create-notification.use-case';
import type { EventNotificationDraft } from '../interfaces/event-notification-draft.interface';

export async function safeCreateNotification(
  createNotification: CreateNotificationUseCase,
  label: string,
  draft: EventNotificationDraft
): Promise<void> {
  try {
    await createNotification.execute(
      draft.userId,
      draft.type,
      draft.title,
      draft.body,
      draft.metadata
    );
  } catch (err) {
    console.error(`[Notifications] Failed to create ${label} notification:`, err);
  }
}
