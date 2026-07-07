export interface Notification {
  Id: string;
  UserId: string;
  Type: string;
  Title: string;
  Body: string;
  Metadata: Record<string, unknown>;
  ReadAt: Date | null;
  CreatedAt: Date;
}

export interface NotificationPrefs {
  UserId: string;
  EmailAlerts: boolean;
  Marketing: boolean;
  FriendRequests: boolean;
  ListShares: boolean;
  ItemClaims: boolean;
  Comments: boolean;
  UpdatedAt: Date;
}

export type NotificationPrefsUpdate = Partial<
  Pick<NotificationPrefs, 'EmailAlerts' | 'Marketing' | 'FriendRequests' | 'ListShares' | 'ItemClaims' | 'Comments'>
>;
