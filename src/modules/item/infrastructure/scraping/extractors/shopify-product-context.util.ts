import { extractVariantIdFromUrl } from './json-ld-product.util';

interface ShopifyOption {
  name: string;
  values: string[];
}

interface ShopifyVariant {
  id?: number | string;
  title?: string;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
}

interface ShopifyProductShape {
  title?: string;
  vendor?: string;
  description?: string;
  options?: string[];
  variants?: ShopifyVariant[];
}

function parseScriptJsonBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern = /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const content = match[1]?.trim();
    if (!content) continue;
    try {
      blocks.push(JSON.parse(content));
    } catch {
      // ignore malformed JSON
    }
  }

  return blocks;
}

function readShopifyProduct(record: Record<string, unknown>): ShopifyProductShape | null {
  const product = record.product;
  if (product && typeof product === 'object') {
    return product as ShopifyProductShape;
  }

  if (typeof record.title === 'string' && Array.isArray(record.variants)) {
    return record as ShopifyProductShape;
  }

  return null;
}

function findShopifyProduct(html: string): ShopifyProductShape | null {
  for (const block of parseScriptJsonBlocks(html)) {
    if (!block || typeof block !== 'object') continue;
    const product = readShopifyProduct(block as Record<string, unknown>);
    if (product?.title) return product;
  }

  const metaMatch = html.match(/var\s+meta\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i);
  if (metaMatch?.[1]) {
    try {
      const parsed = JSON.parse(metaMatch[1]) as Record<string, unknown>;
      const product = readShopifyProduct(parsed);
      if (product?.title) return product;
    } catch {
      // ignore
    }
  }

  return null;
}

function buildOptions(product: ShopifyProductShape): ShopifyOption[] {
  const optionNames = product.options ?? [];
  const variants = product.variants ?? [];
  if (optionNames.length === 0) return [];

  return optionNames.map((name, index) => {
    const key = `option${index + 1}` as keyof ShopifyVariant;
    const values = [
      ...new Set(
        variants
          .map((variant) => variant[key])
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      ),
    ];
    return { name, values };
  });
}

function findSelectedVariant(product: ShopifyProductShape, url: string): ShopifyVariant | null {
  const variants = product.variants ?? [];
  if (variants.length === 0) return null;

  const variantId = extractVariantIdFromUrl(url);
  if (!variantId) return null;

  return (
    variants.find((variant) => String(variant.id) === variantId) ??
    variants.find((variant) => String(variant.id).endsWith(variantId)) ??
    null
  );
}

export interface ShopifyProductContext {
  vendor: string | null;
  productDescription: string | null;
  options: ShopifyOption[];
  selectedVariantTitle: string | null;
}

export function extractShopifyProductContext(html: string, url: string): ShopifyProductContext | null {
  const product = findShopifyProduct(html);
  if (!product) return null;

  const selectedVariant = findSelectedVariant(product, url);
  const options = buildOptions(product);

  return {
    vendor: product.vendor?.trim() || null,
    productDescription: product.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null,
    options,
    selectedVariantTitle: selectedVariant?.title?.trim() || null,
  };
}

export function formatShopifyProductContextLines(context: ShopifyProductContext): string[] {
  const lines: string[] = [];

  if (context.vendor) lines.push(`Vendor: ${context.vendor}`);
  if (context.productDescription) lines.push(`Product Description: ${context.productDescription.slice(0, 1200)}`);

  for (const option of context.options) {
    if (option.values.length > 0) {
      lines.push(`${option.name}: ${option.values.join(', ')}`);
    }
  }

  if (context.selectedVariantTitle) {
    lines.push(`Selected Configuration: ${context.selectedVariantTitle}`);
  }

  return lines;
}
