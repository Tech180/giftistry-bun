import type { ItemDescriptionMetadata } from '@/modules/item';

export interface MergeGrabInfoOptions {
  /** Pack qty from extract/title. Applied when > 1; never lowers an existing higher qty. */
  desiredQuantity?: number | null;
  /** Column-backed metadata from list/get (used when description is already plain text). */
  existingMetadata?: ItemDescriptionMetadata | null;
}
