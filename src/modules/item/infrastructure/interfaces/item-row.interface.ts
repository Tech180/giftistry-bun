export interface ItemRow {
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
  Priority?: number | string | null;
  CreatedAt?: Date | string | null;
  IsFavorite?: boolean | null;
  IsPinned?: boolean | null;
  DesiredQuantity?: number | string | null;
  MultiCount?: boolean | null;
  OtherUsersCanSee?: boolean | null;
  CustomFields?: unknown;
  Variations?: unknown;
  Photos?: unknown;
  AllowSubstitutions?: boolean | null;
  IsSubstitution?: boolean | null;
  SubstitutionForItemId?: string | null;
}
