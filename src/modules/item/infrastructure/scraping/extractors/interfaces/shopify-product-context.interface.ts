import type { ShopifyOption } from './shopify-option.interface';

export interface ShopifyProductContext {
  vendor: string | null;
  productDescription: string | null;
  options: ShopifyOption[];
  selectedVariantTitle: string | null;
}
