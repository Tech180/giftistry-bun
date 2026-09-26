export interface Notification {
  Id: string;
  UserId: string;
  Type: string;
  Title: string;
  Message: string;
  Metadata: Record<string, unknown>;
  ReadAt: Date | null;
  CreatedAt: Date;
}
