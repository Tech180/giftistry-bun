const TOKEN_SPLIT = /[^a-z0-9]+/i;

export function tokenizeTitle(value: string): Set<string> {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return new Set();
  }
  const tokens = normalized.split(TOKEN_SPLIT).filter((t) => t.length > 0);
  return new Set(tokens);
}
