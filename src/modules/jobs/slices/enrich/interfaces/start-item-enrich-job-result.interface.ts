import type { Item } from '@/modules/item';

export interface StartItemEnrichJobResult {
  Job: Record<string, unknown>;
  Item?: Item;
}
