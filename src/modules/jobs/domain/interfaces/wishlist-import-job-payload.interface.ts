export interface WishlistImportJobPayload {
  mode: 'create-list' | 'existing-list';
  listId?: string | null;
  title?: string | null;
  fileName: string;
  format?: string | null;
  content: string;
  contentEncoding: 'text' | 'base64' | 'data-url';
  grabInfo: boolean;
  /** When false, skip AI fallback after deterministic Giftistry parse fails. */
  allowAi?: boolean;
  /**
   * When false, preserve file categories (except uncategorized/general).
   * Default true when omitted (legacy clients).
   */
  optimizeCategories?: boolean;
}
