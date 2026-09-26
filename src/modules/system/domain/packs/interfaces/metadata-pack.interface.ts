import type { MetadataPackField } from './metadata-pack-field.interface';
import type { MetadataPackMatch } from './metadata-pack-match.interface';

export interface MetadataPack {
  id: string;
  label: string;
  description: string;
  match: MetadataPackMatch;
  fields: MetadataPackField[];
  promptFragment: string;
  children?: MetadataPack[];
}
