import type { Claim } from '../interfaces/claim.interface';

export function isGroupFundContribution(claim: Pick<Claim, 'Amount'>): boolean {
  return claim.Amount != null && Number(claim.Amount) > 0;
}

/** Users with at least one partial group-fund contribution on this item. */
export function getGroupFundContributorUserIds(
  claims: Pick<Claim, 'UserId' | 'Amount'>[]
): Set<string> {
  const contributorIds = new Set<string>();
  for (const claim of claims) {
    if (isGroupFundContribution(claim) && claim.UserId) {
      contributorIds.add(claim.UserId);
    }
  }
  return contributorIds;
}

export function shouldRevealAnonymousClaim(
  claim: Pick<Claim, 'UserId' | 'Amount' | 'Anonymous'>,
  viewerUserId: string | null,
  contributorUserIds: Set<string>
): boolean {
  if (!claim.Anonymous) {
    return true;
  }
  if (!claim.UserId) {
    return false;
  }
  if (claim.UserId === viewerUserId) {
    return true;
  }
  if (!isGroupFundContribution(claim)) {
    return false;
  }
  return (
    !!viewerUserId &&
    contributorUserIds.has(viewerUserId) &&
    contributorUserIds.has(claim.UserId)
  );
}

export function redactClaimsForViewer(
  claims: Claim[],
  viewerUserId: string | null
): Claim[] {
  const contributorUserIds = getGroupFundContributorUserIds(claims);
  return claims.map((claim) => {
    if (shouldRevealAnonymousClaim(claim, viewerUserId, contributorUserIds)) {
      return claim;
    }
    return {
      ...claim,
      UserId: null,
      ClaimedByName: 'Anonymous',
    };
  });
}
