export interface ItemClaimSummary {
  IsFullyClaimed: boolean;
  IsMultiCount: boolean;
  TotalClaimedAmount: number;
  TotalClaimedQuantity: number;
  DesiredQuantity: number | null;
  RemainingQuantity: number | null;
  FundingTarget: number;
}
