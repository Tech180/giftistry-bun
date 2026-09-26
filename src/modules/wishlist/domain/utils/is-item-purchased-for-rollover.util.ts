/** Whether an item counts as purchased for wishlist rollover. */
export function isItemPurchasedForRollover(
  claims: { Amount: number | null }[],
  links: { ExtractedPrice: number | null }[],
  allowGroupFunds: boolean
): boolean {
  const totalExtractedPrice = links.reduce(
    (acc, link) => Math.max(acc, link.ExtractedPrice || 0),
    0
  );
  const totalClaimedAmount = claims.reduce(
    (acc, claim) => acc + (claim.Amount || 0),
    0
  );

  if (allowGroupFunds && totalExtractedPrice > 0) {
    return totalClaimedAmount >= totalExtractedPrice;
  }

  return claims.length > 0;
}
