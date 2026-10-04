/** Split a comma-separated export cell into peer display names. */
export function splitExportRelationNames(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
