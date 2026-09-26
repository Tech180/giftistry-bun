import type { ItemDescriptionMetadata } from '../../../domain/interfaces/item-description-metadata.interface';

export interface BulkAddItemInput {
  name: string;
  description?: string | null;
  priorityId?: string | null;
  isHiddenIdea?: boolean;
  linkUrl?: string | null;
  price?: number | null;
  websiteName?: string | null;
  category?: string | null;
  priority?: number | null;
  sharedWithUserIds?: string[];
  metadata?: ItemDescriptionMetadata | null;
}
