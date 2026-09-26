export interface CategoryClassifierInput {
  url: string;
  websiteName: string;
  pageContext: string;
  itemName: string;
  /** Categories already used on this wishlist — prefer when they fit. */
  existingCategories?: string[];
}
