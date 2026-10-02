export function normalizeAmazonBrand(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }
  const visitStore = trimmed.match(/^visit the (.+?) store$/i);
  if (visitStore?.[1]) {
    return visitStore[1].trim();
  }
  const brandPrefix = trimmed.match(/^brand:\s*(.+)$/i);
  if (brandPrefix?.[1]) {
    return brandPrefix[1].trim();
  }
  return trimmed;
}
