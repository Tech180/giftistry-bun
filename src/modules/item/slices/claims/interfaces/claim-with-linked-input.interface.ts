export interface ClaimWithLinkedInput {
  amount: number | null;
  claimedByName: string | null;
  anonymous: boolean;
  quantity: number;
  selection: string | null;
  includeLinked: boolean;
}
