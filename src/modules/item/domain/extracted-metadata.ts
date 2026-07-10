export type ScrapeMode = 'full' | 'minimal';
export type ScrapeSource = 'fetch' | 'playwright';

export interface ExtractedMetadata {
  title: string;
  price: number | null;
  description: string | null;
  color: string | null;
  size: string | null;
  category: string | null;
  imageUrl: string | null;
}
