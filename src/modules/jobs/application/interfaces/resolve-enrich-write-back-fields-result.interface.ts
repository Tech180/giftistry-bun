import type { ItemDescriptionMetadata } from '@/modules/item';

export interface ResolveEnrichWriteBackFieldsResult {
  name: string;
  description: string;
  category: string | null;
  price: number | undefined;
  linkUrl: string;
  websiteName: string | null;
  metadata?: ItemDescriptionMetadata;
  imageUrl?: string | null;
}
