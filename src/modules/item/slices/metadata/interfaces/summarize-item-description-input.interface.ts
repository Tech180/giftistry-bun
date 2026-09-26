export interface SummarizeItemDescriptionInput {
  listId: string;
  name: string;
  text?: string;
  linkUrl?: string;
  websiteName?: string;
  price?: number | null;
  category?: string;
  priority?: number | null;
  customFields?: {
    Predefined?: Record<string, string | null>;
    UserDefined?: Record<string, string>;
  };
  variations?: { Name: string; Quantity: number }[];
  desiredQuantity?: number;
}
