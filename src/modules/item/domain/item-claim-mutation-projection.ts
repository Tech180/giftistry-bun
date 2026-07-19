import type { Claim } from './item.entity';
import type { ItemClaimSummary } from './compute-item-claim-summary.util';

/** Partial item fields returned after claim/unclaim so clients can patch without a full list reload. */
export interface ItemClaimMutationProjection extends ItemClaimSummary {
  Id: string;
  Claims: Claim[];
  IsClaimed: boolean;
}
