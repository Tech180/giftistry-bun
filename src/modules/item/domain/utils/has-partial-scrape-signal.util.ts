import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';

/** True when blocked/low-confidence scrape still yielded a gift-facing title or image. */
export function hasPartialScrapeSignal(metadata: ExtractedMetadata): boolean {
  return Boolean(metadata.title?.trim()) || Boolean(metadata.imageUrl?.trim());
}
