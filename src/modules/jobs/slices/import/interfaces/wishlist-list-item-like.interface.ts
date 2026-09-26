/** Structural slice of a list item used to build the import link index. */
export interface WishlistListItemLike {
  Id?: unknown;
  Name?: unknown;
  Description?: unknown;
  Category?: unknown;
  Priority?: unknown;
  Links?: Array<{
    Url?: string | null;
    ExtractedPrice?: number | null;
    RetailerName?: string | null;
  }> | null;
  [key: string]: unknown;
}
