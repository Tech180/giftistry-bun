import type { ItemEnrichJobPayload } from './item-enrich-job-payload.type';
import type { ItemSummarizeJobPayload } from './item-summarize-job-payload.type';
import type { WishlistImportJobPayload } from './wishlist-import-job-payload.interface';

export type BackgroundJobPayload =
  | WishlistImportJobPayload
  | ItemEnrichJobPayload
  | ItemSummarizeJobPayload;
