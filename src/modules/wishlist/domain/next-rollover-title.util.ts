/**
 * Builds the title for a rolled-over list from the previous title.
 * Trailing ` N` (whitespace + digits) is incremented; otherwise appends ` 1`.
 */
export function nextRolloverTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return '1';
  }

  const match = /^(.*?)\s+(\d+)$/.exec(trimmed);
  const base = match?.[1];
  const n = match?.[2];
  if (base !== undefined && n !== undefined) {
    return `${base.trimEnd()} ${Number(n) + 1}`;
  }
  return `${trimmed} 1`;
}
