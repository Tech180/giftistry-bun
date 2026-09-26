import type { MetadataPack } from './metadata-pack.interface';

export interface CollectEnabledPackFieldsInput {
  enabledPackIds: readonly string[];
  category: string;
  catalog?: readonly MetadataPack[];
}
