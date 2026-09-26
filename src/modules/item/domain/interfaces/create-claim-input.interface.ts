export interface CreateClaimInput {
  itemId: string;
  userId: string;
  amount: number | null;
  claimedByName: string | null;
  anonymous: boolean;
  quantity: number;
  selection: string | null;
}
