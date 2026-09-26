import type { JsonLdProductVariant } from './json-ld-product-variant.interface';

export interface JsonLdProductDetails {
  title: string | null;
  description: string | null;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number | null;
  color: string | null;
  size: string | null;
  selectedVariant: JsonLdProductVariant | null;
  variants: JsonLdProductVariant[];
}
