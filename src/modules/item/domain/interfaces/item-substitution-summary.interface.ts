import type { Claim } from './claim.interface';
import type { Item } from './item.interface';
import type { ItemLink } from './item-link.interface';
import type { ItemPhoto } from './item-photo.interface';

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
