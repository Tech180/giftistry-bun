export interface PushPayload {
  title: string;
  body: string;
  clickUrl?: string;
  notificationId: string;
  type: string;
  metadata?: Record<string, unknown>;
}
