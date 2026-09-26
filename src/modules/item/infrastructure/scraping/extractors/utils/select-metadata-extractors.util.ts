import { GENERIC_EXTRACTORS } from '../constants/generic-extractors.constant';
import type { ExtractorContext } from '../interfaces/extractor-context.interface';
import type { MetadataExtractor } from '../interfaces/metadata-extractor.interface';
import { RETAILER_EXTRACTORS } from '../../retailers/constants/retailer-extractors.constant';
import { matchRetailer } from '../../retailers/retailer-registry';
import { shopifyExtractor } from '../../retailers/shopify.extractor';
import { retailerToExtractor } from './retailer-to-extractor.util';

export function selectMetadataExtractors(context: ExtractorContext): MetadataExtractor[] {
  try {
    const hostname = new URL(context.url).hostname;
    const retailer = matchRetailer(hostname, RETAILER_EXTRACTORS);
    if (retailer) {
      return [retailerToExtractor(retailer), ...GENERIC_EXTRACTORS];
    }
    if (hostname.includes('shopify') || context.html.includes('cdn.shopify.com')) {
      return [retailerToExtractor(shopifyExtractor), ...GENERIC_EXTRACTORS];
    }
  } catch {
    // invalid URL — generic extractors only
  }

  return [...GENERIC_EXTRACTORS];
}
