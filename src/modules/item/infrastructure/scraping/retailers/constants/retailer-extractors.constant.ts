import { amazonExtractor } from '../amazon.extractor';
import { dicksExtractor } from '../dicks.extractor';
import { shopifyExtractor } from '../shopify.extractor';
import { targetExtractor } from '../target.extractor';
import { walmartExtractor } from '../walmart.extractor';
import type { RetailerExtractor } from '../interfaces/retailer-extractor.interface';

export const RETAILER_EXTRACTORS: RetailerExtractor[] = [
  amazonExtractor,
  walmartExtractor,
  targetExtractor,
  dicksExtractor,
  shopifyExtractor,
];
