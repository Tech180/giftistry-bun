import type { MetadataPack } from './metadata-pack.interface';

export interface ResolveMetadataPacksInput {
  enabledPackIds: readonly string[];
  category: string | null;
  itemName: string;
  catalog?: readonly MetadataPack[];
}
