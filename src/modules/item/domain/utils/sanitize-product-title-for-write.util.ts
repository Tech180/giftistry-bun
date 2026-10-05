import { isGenericProductTitle } from './is-generic-product-title.util';
import { stripAmazonRetailSeoTitle } from './strip-amazon-retail-seo-title.util';

export function sanitizeProductTitleForWrite(title: string | null | undefined): string | null {
  const trimmed = title?.replace(/\s+/g, ' ').trim();
  if (!trimmed) {
    return null;
  }

  const stripped = stripAmazonRetailSeoTitle(trimmed);
  const candidate = stripped || trimmed;
  if (!candidate || isGenericProductTitle(candidate)) {
    return null;
  }

  return candidate;
}
