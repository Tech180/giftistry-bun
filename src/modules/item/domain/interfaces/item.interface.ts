import type { ItemAudienceUser } from './item-audience-user.interface';
import type { ItemCustomFieldsColumns } from './item-custom-fields-columns.interface';
import type { ItemLink } from './item-link.interface';
import type { ItemPhoto } from './item-photo.interface';
import type { ItemVariationColumn } from './item-variation-column.interface';

export interface Item {
  Id: string;
  ListId: string;
  PriorityId: string | null;
  SuggestedByUserId: string | null;
  SuggestedByUsername?: string | null;
  SuggestedByFirstName?: string | null;
  SuggestedByLastName?: string | null;
  Name: string;
  Description: string | null;
  IsHiddenIdea: boolean;
  IsSuggestion?: boolean;
  Category: string;
  Priority?: number | null;
  CreatedAt?: Date;
  SharedWith?: ItemAudienceUser[];
  Links?: ItemLink[];
  Photos?: ItemPhoto[];
  /** First-class metadata columns (preferred over Description JSON). */
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  OtherUsersCanSee?: boolean | null;
  CustomFields?: ItemCustomFieldsColumns | null;
  Variations?: ItemVariationColumn[] | null;
  LinkedItemIds?: string[];
  RelatedItemIds?: string[];
  AllowSubstitutions?: boolean;
  IsSubstitution?: boolean;
  SubstitutionForItemId?: string | null;
}
