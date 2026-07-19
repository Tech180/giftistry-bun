import type { Claim, ItemLink } from './item.entity';
import type { ItemDescriptionMetadata } from './item-description.util';
import { parseItemDescription } from './item-description.util';

export interface ItemClaimSummary {
  IsFullyClaimed: boolean;
  IsMultiCount: boolean;
  TotalClaimedAmount: number;
  TotalClaimedQuantity: number;
  DesiredQuantity: number | null;
  RemainingQuantity: number | null;
  FundingTarget: number;
}

export function computeItemClaimSummary(input: {
  description?: string | null;
  metadata?: ItemDescriptionMetadata | null;
  claims: Claim[];
  links: ItemLink[];
  allowGroupFunds: boolean;
  /** When true (owner viewing pre-expiry), claim details are hidden. */
  hideClaims?: boolean;
}): ItemClaimSummary {
  if (input.hideClaims) {
    return {
      IsFullyClaimed: false,
      IsMultiCount: false,
      TotalClaimedAmount: 0,
      TotalClaimedQuantity: 0,
      DesiredQuantity: null,
      RemainingQuantity: null,
      FundingTarget: 0,
    };
  }

  const metadata =
    input.metadata ??
    parseItemDescription(input.description).metadata;
  const claims = input.claims ?? [];
  const isMultiCount = !!metadata?.MultiCount;
  const desiredQuantity = isMultiCount
    ? Number(metadata?.DesiredQuantity) || 1
    : null;
  const fundingTarget = (input.links ?? []).reduce(
    (max, link) => Math.max(max, Number(link.ExtractedPrice || 0)),
    0
  );
  const totalClaimedAmount = claims.reduce(
    (sum, claim) => sum + Number(claim.Amount || 0),
    0
  );
  const totalClaimedQuantity = claims.reduce(
    (sum, claim) => sum + (claim.Quantity || 1),
    0
  );

  let isFullyClaimed = false;
  if (isMultiCount && desiredQuantity != null) {
    isFullyClaimed = totalClaimedQuantity >= desiredQuantity;
  } else if (input.allowGroupFunds && fundingTarget > 0) {
    isFullyClaimed = totalClaimedAmount >= fundingTarget;
  } else {
    isFullyClaimed =
      claims.some((claim) => claim.Amount === null) || claims.length > 0;
  }

  const remainingQuantity =
    isMultiCount && desiredQuantity != null
      ? Math.max(0, desiredQuantity - totalClaimedQuantity)
      : null;

  return {
    IsFullyClaimed: isFullyClaimed,
    IsMultiCount: isMultiCount,
    TotalClaimedAmount: totalClaimedAmount,
    TotalClaimedQuantity: totalClaimedQuantity,
    DesiredQuantity: desiredQuantity,
    RemainingQuantity: remainingQuantity,
    FundingTarget: fundingTarget,
  };
}
