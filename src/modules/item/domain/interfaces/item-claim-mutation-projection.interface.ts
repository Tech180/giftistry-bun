import type { Claim } from './claim.interface';
import type { ItemClaimSummary } from './item-claim-summary.interface';

/** Partial item fields returned after claim/unclaim so clients can patch without a full list reload. */
export interface ItemClaimMutationProjection extends ItemClaimSummary {
  Id: string;
  Claims: Claim[];
  IsClaimed: boolean;
}
