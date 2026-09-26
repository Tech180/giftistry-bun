export type ItemSummarizeJobPayload = {
  listId: string;
  itemId?: string | null;
  writeBack: boolean;
  name: string;
  text?: string | null;
  linkUrl?: string | null;
  websiteName?: string | null;
  price?: number | null;
  category?: string | null;
  priority?: number | null;
  customFields?: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  };
  variations?: { Name: string; Quantity: number }[];
  desiredQuantity?: number | null;
};
