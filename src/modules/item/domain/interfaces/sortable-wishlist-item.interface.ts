export interface SortableWishlistItem {
  Id?: string;
  Name: string;
  Category?: string | null;
  Priority?: number | null;
  Description?: string | null;
  IsFavorite?: boolean;
  Metadata?: {
    IsFavorite?: boolean;
    IsPinned?: boolean;
  } | null;
}
