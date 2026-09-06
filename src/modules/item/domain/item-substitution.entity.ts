import type { Item, ItemLink, Claim, ItemPhoto } from './item.entity';

export type ItemSubstitutionKind = 'owner_approved' | 'claimer_custom';

export interface ItemSubstitutionRow {
  Id: string;
  ParentItemId: string;
  SubstitutionItemId: string;
  Kind: ItemSubstitutionKind;
  CreatedByUserId: string;
  SortOrder: number;
  CreatedAt?: Date;
}

/** Compact child item payload attached to a parent DTO. */
export interface ItemSubstitutionSummary {
  Id: string;
  Name: string;
  Description: string | null;
  Category: string;
  PriorityId: string | null;
  Priority: number | null;
  IsHiddenIdea?: boolean;
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  CustomFields?: Item['CustomFields'];
  Variations?: Item['Variations'];
  Links: ItemLink[];
  Photos: ItemPhoto[];
  Claims: Claim[];
  IsClaimed: boolean;
  IsFullyClaimed?: boolean;
  FundingTarget?: number;
  TotalClaimedAmount?: number;
  TotalClaimedQuantity?: number;
  RemainingQuantity?: number | null;
}

export interface ItemSubstitutionOption {
  Id: string;
  Kind: ItemSubstitutionKind;
  SortOrder: number;
  CreatedByUserId: string;
  Item: ItemSubstitutionSummary;
}

export const MAX_OWNER_APPROVED_SUBSTITUTIONS = 10;

export function isOwnerApprovedKind(kind: string): kind is 'owner_approved' {
  return kind === 'owner_approved';
}

export function isClaimerCustomKind(kind: string): kind is 'claimer_custom' {
  return kind === 'claimer_custom';
}

export function toSubstitutionSummary(
  item: Item,
  links: ItemLink[],
  claims: Claim[]
): ItemSubstitutionSummary {
  return {
    Id: item.Id,
    Name: item.Name,
    Description: item.Description,
    Category: item.Category || 'uncategorized',
    PriorityId: item.PriorityId ?? null,
    Priority: item.Priority ?? null,
    IsHiddenIdea: item.IsHiddenIdea === true,
    IsFavorite: item.IsFavorite === true,
    IsPinned: item.IsPinned === true,
    DesiredQuantity: item.DesiredQuantity ?? null,
    MultiCount: item.MultiCount === true,
    CustomFields: item.CustomFields ?? null,
    Variations: item.Variations ?? null,
    Links: links,
    Photos: item.Photos ?? [],
    Claims: claims,
    IsClaimed: claims.length > 0,
    IsFullyClaimed: claims.some((c) => c.Amount === null),
  };
}
