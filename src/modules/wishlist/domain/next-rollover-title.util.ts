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
  if (match) {
    const base = match[1].trimEnd();
    const next = Number(match[2]) + 1;
    return `${base} ${next}`;
  }
  return `${trimmed} 1`;
}
