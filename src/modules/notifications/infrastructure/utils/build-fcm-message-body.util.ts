import type { PushPayload } from '../../domain/interfaces/push-payload.interface';

export function buildFcmMessageBody(deviceToken: string, payload: PushPayload): string {
  return JSON.stringify({
    message: {
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        notificationId: payload.notificationId,
        type: payload.type,
        ...(payload.clickUrl ? { clickUrl: payload.clickUrl } : {}),
      },
    },
  });
}
