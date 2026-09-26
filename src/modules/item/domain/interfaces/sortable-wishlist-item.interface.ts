export interface SortableWishlistItem {
  Name: string;
  Category?: string | null;
  Priority?: number | null;
  Description?: string | null;
  Metadata?: {
    IsFavorite?: boolean;
    IsPinned?: boolean;
  } | null;
}
