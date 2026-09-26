export interface ListLinkTokenPublicRow {
  Id: string;
  ListId: string;
  Token: string | null;
  Role: string;
  CreatedBy: string;
  ExpiresAt: Date | string | null;
  MaxUses: number | null;
  UseCount: number;
  RevokedAt: Date | string | null;
  PasswordProtected: boolean;
  CreatedAt: Date | string;
}
