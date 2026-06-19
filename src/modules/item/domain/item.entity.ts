export interface Item {
  Id: string;
  ListId: string;
  PriorityId: string | null;
  SuggestedByUserId: string | null;
  Name: string;
  Description: string | null;
  IsHiddenIdea: boolean;
  Category: string;
  CreatedAt?: Date;
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
  ClaimedAt?: Date;
}
