import type { ItemSubstitutionKind } from '../types/item-substitution-kind.type';
import type { ItemMetadataWrite } from './item-metadata-write.interface';

export interface CreateSubstitutionItemInput {
  listId: string;
  parentItemId: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  kind: ItemSubstitutionKind;
  sortOrder: number;
  category?: string;
  priorityId?: string | null;
  priority?: number | null;
  isHiddenIdea?: boolean;
  metadata?: ItemMetadataWrite | null;
}
