import type { Claim, Item, ItemLink } from './item.entity';
import { computeItemClaimSummary } from './compute-item-claim-summary.util';
import {
  toSubstitutionSummary,
  type ItemSubstitutionSummary,
} from './item-substitution.entity';

/**
 * Builds a substitution child summary with per-variant funding aggregates
 * from computeItemClaimSummary (independent of the parent item).
 */
export function buildSubstitutionSummaryWithClaimSummary(
  item: Item,
  links: ItemLink[],
  claims: Claim[],
  options: {
    allowGroupFunds: boolean;
    hideClaims?: boolean;
  }
): ItemSubstitutionSummary {
  const base = toSubstitutionSummary(item, links, claims);
  const claimSummary = computeItemClaimSummary({
    description: item.Description,
    claims,
    links,
    allowGroupFunds: options.allowGroupFunds,
    hideClaims: options.hideClaims,
  });

  return {
    ...base,
    FundingTarget: claimSummary.FundingTarget,
    TotalClaimedAmount: claimSummary.TotalClaimedAmount,
    TotalClaimedQuantity: claimSummary.TotalClaimedQuantity,
    DesiredQuantity: claimSummary.DesiredQuantity ?? base.DesiredQuantity,
    RemainingQuantity: claimSummary.RemainingQuantity,
    MultiCount: claimSummary.IsMultiCount || base.MultiCount,
    IsFullyClaimed: claimSummary.IsFullyClaimed,
  };
}
