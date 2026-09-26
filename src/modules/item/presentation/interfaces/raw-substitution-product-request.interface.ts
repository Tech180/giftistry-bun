import type { RawItemMetadataRequest } from './raw-item-metadata-request.interface';

export interface RawSubstitutionProductRequest {
  Name: string;
  Description?: string | null;
  LinkUrl?: string | null;
  Price?: number | null;
  WebsiteName?: string | null;
  Category?: string | null;
  PriorityId?: string | null;
  Priority?: number | null;
  IsHiddenIdea?: boolean | null;
  Metadata?: RawItemMetadataRequest | null;
}
