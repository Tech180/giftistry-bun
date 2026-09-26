export interface ItemRemovedNotificationDraft {
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  claimerUserIds: string[];
}
