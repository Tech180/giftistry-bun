export interface NotificationRow {
  Id: string;
  UserId: string;
  Type: string;
  Title: string;
  Message: string | null;
  Metadata: Record<string, unknown> | null;
  ReadAt: Date | string | null;
  CreatedAt: Date | string;
}
