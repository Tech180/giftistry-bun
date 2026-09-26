export interface NotificationPrefsRow {
  UserId: string;
  EmailAlerts: boolean;
  Marketing: boolean;
  FriendRequests: boolean;
  ListShares: boolean;
  ItemClaims: boolean;
  Comments: boolean;
  JobCompletions: boolean | null;
  PushAlerts: boolean | null;
  UpdatedAt: Date | string;
}
