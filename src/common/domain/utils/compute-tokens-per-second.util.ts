/** Tokens per second from token count and elapsed milliseconds. */
export function computeTokensPerSecond(
  tokenCount: number,
  elapsedMs: number
): number | null {
  if (!(tokenCount > 0) || !(elapsedMs > 0)) {
    return null;
  }

  return Math.max(1, Math.round((tokenCount / elapsedMs) * 1000));
}
