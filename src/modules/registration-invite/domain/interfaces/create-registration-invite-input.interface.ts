export interface CreateRegistrationInviteInput {
  tokenHash: string;
  token: string;
  expiresAt: Date;
  maxUses: number | null;
  createdBy: string | null;
}
