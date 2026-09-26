import type { MetadataPackView } from './metadata-pack-view.interface';
export interface MetadataPacksResult {
  Catalog: MetadataPackView[];
  EnabledPackIds: string[];
}
