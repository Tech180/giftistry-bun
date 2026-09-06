/** Round to cents for stable money comparisons (avoids float drift e.g. 30 + 19.99). */
export function toMoneyCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100);
}

export function isMoneyAmountAtLeast(claimed: number, target: number): boolean {
  return toMoneyCents(claimed) >= toMoneyCents(target);
}

export function moneyAmountLeftover(target: number, claimed: number): number {
  return Math.max(0, toMoneyCents(target) - toMoneyCents(claimed)) / 100;
}

export function wouldExceedMoneyTarget(
  claimed: number,
  additional: number,
  target: number
): boolean {
  return toMoneyCents(claimed) + toMoneyCents(additional) > toMoneyCents(target);
}
