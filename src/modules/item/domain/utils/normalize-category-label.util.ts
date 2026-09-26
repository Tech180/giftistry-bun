export function normalizeCategoryLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'uncategorized';
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'uncategorized';
}
