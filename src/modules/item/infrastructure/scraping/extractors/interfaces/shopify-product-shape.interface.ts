import type { ShopifyVariant } from './shopify-variant.interface';

export interface ShopifyProductShape {
  title?: string;
  vendor?: string;
  description?: string;
  options?: string[];
  variants?: ShopifyVariant[];
}
