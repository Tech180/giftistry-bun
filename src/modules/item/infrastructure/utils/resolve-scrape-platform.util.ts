import { RETAILER_EXTRACTORS } from '../scraping/retailers/constants/retailer-extractors.constant';
import { matchRetailer } from '../scraping/retailers/retailer-registry';
import { PLATFORM_BY_RETAILER } from '../constants/platform-by-retailer.constant';

export function resolveScrapePlatform(url: string, html?: string): string {
  try {
    const hostname = new URL(url).hostname;
    const retailer = matchRetailer(hostname, RETAILER_EXTRACTORS);
    if (retailer) {
      return PLATFORM_BY_RETAILER.get(retailer) ?? 'generic';
    }
    if (hostname.includes('shopify') || html?.includes('cdn.shopify.com')) {
      return 'shopify';
    }
  } catch {
    /* invalid URL */
  }
  return 'generic';
}
