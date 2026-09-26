export interface ListEmailInviteRow {
  Id: string;
  ListId: string;
  Email: string;
  Role: string;
  TokenHash: string;
  InvitedBy: string;
  ExpiresAt: Date | string;
  AcceptedAt: Date | string | null;
  CreatedAt: Date | string;
}
