/** Where a scraped field value was observed. */
export type ExtractorSource =
  | 'json-ld'
  | 'open-graph'
  | 'meta'
  | 'dom'
  | 'embedded-json'
  | 'slug'
  | 'retailer'
  | 'network'
  | 'ai'
  | 'unknown';
