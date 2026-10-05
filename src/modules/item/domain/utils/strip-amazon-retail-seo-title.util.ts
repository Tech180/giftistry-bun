/** Strip Amazon.com SEO wrappers from og:title / document title before gift-facing use. */
export function stripAmazonRetailSeoTitle(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return '';
  }

  let result = trimmed.replace(/^Amazon\.com:\s*/i, '').trim();
  if (/^Amazon\.com:/i.test(trimmed) && result.includes(':')) {
    result = result.replace(/\s*:\s*[^:]+\s*$/, '').trim();
  }

  return result;
}
