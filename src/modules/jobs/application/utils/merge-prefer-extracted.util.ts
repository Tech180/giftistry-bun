export function mergePreferExtracted(
  extracted: string | null | undefined,
  existing: string | null | undefined,
  fallback = ''
): string {
  const next = extracted?.trim();
  if (next) return next;
  const keep = existing?.trim();
  if (keep) return keep;
  return fallback;
}
