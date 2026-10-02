import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';
import { normalizeGiftFacingTitle } from './normalize-gift-facing-title.util';
import { isUnusableProductDescription } from './product-description.util';

/**
 * Last-line gift-list polish so scrape-only / failed-AI / echoed-SEO titles
 * never ship marketplace laundry lists into the add-item form.
 */
export function polishGiftFacingMetadata(data: ExtractedMetadata): ExtractedMetadata {
  const title = normalizeGiftFacingTitle(data.title);

  let description = data.description?.trim() || null;
  if (description && isUnusableProductDescription(description)) {
    description = null;
  }

  return {
    ...data,
    title,
    description,
  };
}
