import type { MetadataExtractor } from '../extractors/types';

export interface RetailerExtractor {
  hostnames: string[];
  priority: number;
  extract: MetadataExtractor['extract'];
}

export function matchRetailer(hostname: string, retailers: RetailerExtractor[]): RetailerExtractor | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  for (const retailer of retailers) {
    for (const pattern of retailer.hostnames) {
      const normalized = pattern.toLowerCase().replace(/^www\./, '');
      if (host === normalized || host.endsWith(`.${normalized}`)) {
        return retailer;
      }
    }
  }
  return null;
}
