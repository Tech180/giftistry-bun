/**
 * Builds a duplicate list title that does not collide with existing titles
 * owned by the same user.
 *
 * `"Holiday"` → `"Holiday (copy)"` → `"Holiday (copy 2)"` …
 */
export function nextDuplicateTitle(baseTitle: string, existingTitles: Iterable<string>): string {
  const base = baseTitle.trim() || 'Wishlist';
  const occupied = new Set(
    [...existingTitles].map((title) => title.trim().toLowerCase()).filter(Boolean)
  );

  const first = `${base} (copy)`;
  if (!occupied.has(first.toLowerCase())) {
    return first;
  }

  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base} (copy ${n})`;
    if (!occupied.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return `${base} (copy ${Date.now()})`;
}
