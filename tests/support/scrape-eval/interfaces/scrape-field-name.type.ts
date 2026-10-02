export type ScrapeEvalFieldName = 'title' | 'price' | 'imageUrl';

export const SCRAPE_EVAL_FIELDS: readonly ScrapeEvalFieldName[] = [
  'title',
  'price',
  'imageUrl',
] as const;
