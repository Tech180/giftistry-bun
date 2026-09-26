import type { MetadataExtractor } from '../interfaces/metadata-extractor.interface';
import type { RetailerExtractor } from '../../retailers/interfaces/retailer-extractor.interface';

export function retailerToExtractor(retailer: RetailerExtractor): MetadataExtractor {
  const hostname = retailer.hostnames[0] ?? 'unknown';
  return {
    name: `retailer:${hostname}`,
    priority: retailer.priority,
    extract: retailer.extract,
  };
}
