import type { ItemDescriptionMetadata } from '@/modules/item';

export interface ExistingItemState {
  name: string;
  description: string | null;
  category: string;
  priority: number | null;
  metadata: ItemDescriptionMetadata | null;
}
