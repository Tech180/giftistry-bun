import type { MetadataExtractor } from './interfaces/metadata-extractor.interface';
import { extractJsonLdFieldsFromObject } from './utils/extract-json-ld-fields.util';
import { extractJsonLdProductDetails, parseJsonLdBlocks } from './utils/json-ld-product.util';

export const jsonLdExtractor: MetadataExtractor = {
  name: 'json-ld',
  priority: 50,
  extract({ html, url, mode }) {
    const productGroup = extractJsonLdProductDetails(html, url);
    const acc = {
      title: productGroup?.title ?? null,
      price: productGroup?.price ?? null,
      description: productGroup?.description ?? null,
      imageUrl: productGroup?.imageUrl ?? null,
      color: productGroup?.color ?? null,
      size: productGroup?.size ?? null,
    };

    const userDefinedFields: Record<string, string> = {};
    if (productGroup?.brand) {
      userDefinedFields.Brand = productGroup.brand;
    }

    for (const block of parseJsonLdBlocks(html)) {
      if (Array.isArray(block)) block.forEach((item) => extractJsonLdFieldsFromObject(item, acc));
      else extractJsonLdFieldsFromObject(block, acc);
    }

    if (mode === 'minimal') {
      return { title: acc.title, price: acc.price, description: acc.description, imageUrl: acc.imageUrl };
    }

    return {
      ...acc,
      ...(Object.keys(userDefinedFields).length > 0 ? { userDefinedFields } : {}),
    };
  },
};
