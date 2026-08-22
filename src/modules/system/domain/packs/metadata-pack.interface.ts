export type MetadataPackFieldBucket = 'predefined' | 'userDefined';

export interface MetadataPackField {
  key: string;
  label: string;
  bucket: MetadataPackFieldBucket;
  hint?: string;
}

export interface MetadataPackMatch {
  categories: string[];
  titleKeywords?: string[];
}

export interface MetadataPack {
  id: string;
  label: string;
  description: string;
  match: MetadataPackMatch;
  fields: MetadataPackField[];
  promptFragment: string;
  children?: MetadataPack[];
}
