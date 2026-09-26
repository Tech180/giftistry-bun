import type { ItemDescriptionMetadata } from '../../../domain/interfaces/item-description-metadata.interface';

/** Product-field subset accepted on substitution create/update bodies. */
export interface CreateSubstitutionPayload {
  Name: string;
  Description?: string | null;
  LinkUrl?: string | null;
  Price?: number | null;
  WebsiteName?: string | null;
  Category?: string | null;
  PriorityId?: string | null;
  Priority?: number | null;
  /** Claimer custom only: hide from list owner when true (default true on create if omitted). */
  IsHiddenIdea?: boolean | null;
  Metadata?: ItemDescriptionMetadata | null;
}
