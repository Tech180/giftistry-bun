import type { GiftistryExportLinkFields } from './giftistry-export-link-fields.interface';

export interface GiftistryExportItemFields {
  name: string;
  category: string;
  priorityLabel: string;
  priority: number | null;
  star: string;
  isFavorite: boolean;
  description: string;
  audience: string;
  suggestion: string;
  linkedItems: string;
  relatedItems: string;
  linkedPeerNames: string[];
  relatedPeerNames: string[];
  links: GiftistryExportLinkFields[];
  customFields: Array<{ key: string; value: string }>;
}
