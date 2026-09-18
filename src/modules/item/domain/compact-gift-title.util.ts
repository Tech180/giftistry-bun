/**
 * Shorten marketplace SEO titles for gift-list display when AI omits Title.
 * Keeps the leading product identity; drops comma/pipe laundry lists.
 */
export function compactGiftTitle(title: string | null | undefined): string {
  const trimmed = title?.replace(/\s+/g, ' ').trim() ?? '';
  if (!trimmed) return '';

  let compact = trimmed.split(/\s*[,|]\s*/)[0]?.trim() || trimmed;
  compact = compact.replace(/\s+[-–—]\s+.*$/, '').trim() || compact;

  // Drop trailing "for …" compatibility laundry when the core name is already long.
  if (compact.length > 64) {
    compact = compact.replace(/\s+for\s+PC\b.*$/i, '').trim() || compact;
  }

  if (compact.length > 90) {
    compact = compact.slice(0, 90).replace(/\s+\S*$/, '').trim() || compact.slice(0, 90);
  }

  return compact;
}
