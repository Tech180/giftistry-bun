export interface PartialExtraction {
  title?: string | null;
  price?: number | null;
  description?: string | null;
  color?: string | null;
  size?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  userDefinedFields?: Record<string, string>;
  titleFromSlug?: boolean;
}
