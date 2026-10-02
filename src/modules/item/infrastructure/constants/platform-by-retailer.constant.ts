import type { RetailerExtractor } from '../scraping/retailers/interfaces/retailer-extractor.interface';
import { amazonExtractor } from '../scraping/retailers/amazon.extractor';
import { dicksExtractor } from '../scraping/retailers/dicks.extractor';
import { shopifyExtractor } from '../scraping/retailers/shopify.extractor';
import { targetExtractor } from '../scraping/retailers/target.extractor';
import { walmartExtractor } from '../scraping/retailers/walmart.extractor';

export const PLATFORM_BY_RETAILER = new Map<RetailerExtractor, string>([
  [amazonExtractor, 'amazon'],
  [walmartExtractor, 'walmart'],
  [targetExtractor, 'target'],
  [dicksExtractor, 'dicks'],
  [shopifyExtractor, 'shopify'],
]);
