import type { Claim } from './item.entity';

export function isAnonymousClaim(
  claim: Pick<Claim, 'Anonymous' | 'ClaimedByName'>
): boolean {
  return Boolean(claim.Anonymous) || claim.ClaimedByName === 'Anonymous';
}

/**
 * Unique claimant display names for exports: one per named UserId, plus a single
 * consolidated "Anonymous" when other viewers' anonymous claims are present.
 */
export function resolveClaimDisplayNames(
  claims: Pick<Claim, 'UserId' | 'ClaimedByName' | 'Anonymous'>[],
  currentUserId?: string | null
): string[] {
  const names: string[] = [];
  const seenUserIds = new Set<string>();
  let hasOtherAnonymous = false;

  for (const claim of claims) {
    if (isAnonymousClaim(claim)) {
      if (currentUserId && claim.UserId === currentUserId) {
        if (seenUserIds.has(currentUserId)) {
          continue;
        }
        seenUserIds.add(currentUserId);
        names.push(claim.ClaimedByName?.trim() || 'Someone');
        continue;
      }

      hasOtherAnonymous = true;
      continue;
    }

    if (!claim.UserId || seenUserIds.has(claim.UserId)) {
      continue;
    }

    seenUserIds.add(claim.UserId);
    names.push(claim.ClaimedByName?.trim() || 'Someone');
  }

  if (hasOtherAnonymous) {
    names.push('Anonymous');
  }

  return names;
}
