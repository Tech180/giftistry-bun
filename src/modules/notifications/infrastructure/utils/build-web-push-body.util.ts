import type { PushPayload } from '../../domain/interfaces/push-payload.interface';

export function buildWebPushBody(payload: PushPayload): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    clickUrl: payload.clickUrl,
    notificationId: payload.notificationId,
    type: payload.type,
  });
}
