export interface WishlistLinkIndexEntry {
  itemId: string;
  name: string;
  description: string | null;
  category: string;
  priority: number | null;
  price: number | null;
  websiteName: string | null;
  linkUrl: string;
}
