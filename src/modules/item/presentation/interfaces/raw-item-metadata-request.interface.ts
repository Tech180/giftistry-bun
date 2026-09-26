export interface RawItemMetadataRequest {
  Text?: string | null;
  CustomFields?: {
    Predefined?: Record<string, string | null> | null;
    UserDefined?: Record<string, string> | null;
  } | null;
  DesiredQuantity?: number | null;
  Variations?: Array<{ Name: string; Quantity: number }> | null;
  LinkedItemIds?: string[] | null;
  RelatedItemIds?: string[] | null;
  OtherUsersCanSee?: boolean | null;
  MultiCount?: boolean | null;
  IsFavorite?: boolean | null;
  IsPinned?: boolean | null;
  AllowSubstitutions?: boolean | null;
  Photos?: Array<{ DataUrl: string }> | null;
}
