import type { ItemAudienceUser } from './item-audience.entity';

export interface Item {
  Id: string;
  ListId: string;
  PriorityId: string | null;
  SuggestedByUserId: string | null;
  SuggestedByUsername?: string | null;
  Name: string;
  Description: string | null;
  IsHiddenIdea: boolean;
  IsSuggestion?: boolean;
  Category: string;
  Priority?: number | null;
  CreatedAt?: Date;
  SharedWith?: ItemAudienceUser[];
}

export interface ItemLink {
  Id: string;
  ItemId: string;
  Url: string;
  RetailerName: string | null;
  ExtractedPrice: number | null;
  ExtractedImageUrl: string | null;
}

export interface Claim {
  Id: string;
  ItemId: string;
  UserId: string | null;
  Amount: number | null;
  ClaimedByName: string | null;
  Anonymous?: boolean;
  ClaimedAt?: Date;
  Quantity?: number;
  Selection?: string | null;
}
