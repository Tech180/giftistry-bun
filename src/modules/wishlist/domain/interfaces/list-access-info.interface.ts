export interface ListAccessInfo {
  listId: string;
  ownerId: string;
  expiresAt: Date | null;
  isActive: boolean;
  ownerDisabled: boolean;
}
