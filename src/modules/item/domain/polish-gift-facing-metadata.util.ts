import type { ExtractedMetadata } from './extracted-metadata';
import { compactGiftTitle } from './compact-gift-title.util';
import { isVerboseProductTitle } from './merge-extracted-metadata';
import { isUnusableProductDescription } from './product-description.util';

/**
 * Last-line gift-list polish so scrape-only / failed-AI / echoed-SEO titles
 * never ship marketplace laundry lists into the add-item form.
 */
export function polishGiftFacingMetadata(data: ExtractedMetadata): ExtractedMetadata {
  let title = data.title?.trim() || '';
  if (isVerboseProductTitle(title)) {
    title = compactGiftTitle(title) || title;
  }

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
