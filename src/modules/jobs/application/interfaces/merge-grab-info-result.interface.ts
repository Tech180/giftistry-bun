import type { ItemDescriptionMetadata } from '@/modules/item';

export interface MergeGrabInfoResult {
  text: string | null;
  metadata: ItemDescriptionMetadata | null;
}
