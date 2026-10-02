/** Absolute epoch-ms deadline for a total relative budget starting at `now`. */
export function resolveDeadlineAt(budgetMs: number, now: number = Date.now()): number {
  return now + budgetMs;
}

/** Remaining ms until `deadlineAt`, or `undefined` when no deadline is set. */
export function remainingBudgetMs(
  deadlineAt: number | undefined,
  now: number = Date.now()
): number | undefined {
  if (deadlineAt == null) return undefined;
  return Math.max(0, deadlineAt - now);
}

/** True when a deadline is set and fewer than `minMs` remain. */
export function isBudgetExhausted(
  deadlineAt: number | undefined,
  minMs: number,
  now: number = Date.now()
): boolean {
  const remaining = remainingBudgetMs(deadlineAt, now);
  return remaining != null && remaining < minMs;
}

/** Caps a wait/navigation timeout by the remaining budget (never below 1ms; 0 means "no timeout" in Playwright). */
export function boundTimeoutMs(
  timeoutMs: number,
  deadlineAt: number | undefined,
  now: number = Date.now()
): number {
  const remaining = remainingBudgetMs(deadlineAt, now);
  if (remaining == null) return timeoutMs;
  return Math.max(1, Math.min(timeoutMs, remaining));
}
