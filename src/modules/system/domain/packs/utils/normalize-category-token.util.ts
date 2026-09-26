export function normalizeCategoryToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return (
    trimmed
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || ''
  );
}
