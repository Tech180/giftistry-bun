export interface JsonLdProductVariant {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
  sku: string | null;
  color: string | null;
  size: string | null;
}

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

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const content = match[1]?.trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // ignore malformed JSON-LD
    }
  }

  return blocks;
}

export function extractVariantIdFromUrl(url: string): string | null {
  try {
    const variant = new URL(url).searchParams.get('variant');
    return variant?.trim() || null;
  } catch {
    return null;
  }
}

export function parseSizeFromVariantName(variantName: string, productName?: string | null): string | null {
  const trimmed = variantName.trim();
  if (!trimmed) return null;

  const productPrefix = productName?.trim();
  if (productPrefix) {
    const separators = [' - ', ' – ', ' — ', ' / '];
    for (const separator of separators) {
      const prefix = `${productPrefix}${separator}`;
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
        const size = trimmed.slice(prefix.length).trim();
        if (size) return size;
      }
    }
  }

  const dashMatch = trimmed.match(/\s[-–—/]\s(.+)$/);
  if (dashMatch?.[1]?.trim()) return dashMatch[1].trim();

  const sizeLabelMatch = trimmed.match(/\b(?:size|sz)\s*[:]\s*(.+)$/i);
  if (sizeLabelMatch?.[1]?.trim()) return sizeLabelMatch[1].trim();

  return null;
}

function readBrand(record: Record<string, unknown>): string | null {
  const brand = record.brand;
  if (typeof brand === 'string' && brand.trim()) return brand.trim();
  if (brand && typeof brand === 'object' && 'name' in brand) {
    const name = (brand as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return null;
}

function readVariant(record: Record<string, unknown>, productName?: string | null): JsonLdProductVariant | null {
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) return null;

  const id = typeof record['@id'] === 'string' ? record['@id'] : '';
  let price: number | null = null;
  let imageUrl: string | null = null;

  if (record.offers && typeof record.offers === 'object') {
    const offers = record.offers as Record<string, unknown>;
    price = parsePrice(offers.price ?? offers.lowPrice ?? offers.highPrice);
  }

  if (typeof record.image === 'string' && record.image.trim()) {
    imageUrl = record.image.trim();
  } else if (Array.isArray(record.image) && typeof record.image[0] === 'string') {
    imageUrl = record.image[0].trim();
  }

  let color: string | null = null;
  if (typeof record.color === 'string' && record.color.trim()) {
    color = record.color.trim();
  } else if (record.color && typeof record.color === 'object' && 'name' in record.color) {
    color = String((record.color as { name: unknown }).name).trim() || null;
  }

  const explicitSize =
    typeof record.size === 'string'
      ? record.size.trim()
      : record.size && typeof record.size === 'object' && 'name' in record.size
        ? String((record.size as { name: unknown }).name).trim()
        : null;

  return {
    id,
    name,
    price,
    imageUrl,
    sku: typeof record.sku === 'string' ? record.sku.trim() : null,
    color,
    size: explicitSize || parseSizeFromVariantName(name, productName),
  };
}

function variantMatchesUrl(variant: JsonLdProductVariant, url: string, variantId: string | null): boolean {
  if (variantId) {
    if (variant.id.includes(variantId)) return true;
    try {
      const parsed = new URL(url);
      if (variant.id.includes(parsed.search)) return true;
    } catch {
      // ignore invalid URL
    }
  }

  try {
    const pageUrl = new URL(url);
    const pageVariant = pageUrl.searchParams.get('variant');
    if (pageVariant && variant.id.includes(pageVariant)) return true;
  } catch {
    // ignore invalid URL
  }

  return false;
}

function extractFromProductGroup(
  record: Record<string, unknown>,
  url: string
): JsonLdProductDetails | null {
  const type = String(record['@type'] ?? '').toLowerCase();
  if (!type.includes('productgroup') && !Array.isArray(record.hasVariant)) return null;

  const productName = typeof record.name === 'string' ? record.name.trim() : null;
  const variantsRaw = record.hasVariant;
  if (!Array.isArray(variantsRaw) || variantsRaw.length === 0) return null;

  const variants = variantsRaw
    .map((entry) => (entry && typeof entry === 'object' ? readVariant(entry as Record<string, unknown>, productName) : null))
    .filter((entry): entry is JsonLdProductVariant => entry !== null);

  if (variants.length === 0) return null;

  const variantId = extractVariantIdFromUrl(url);
  const selectedVariant =
    variants.find((variant) => variantMatchesUrl(variant, url, variantId)) ??
    (variantId ? variants.find((variant) => variant.id.includes(variantId)) : null) ??
    null;

  return {
    title: productName,
    description: typeof record.description === 'string' ? record.description.trim() : null,
    brand: readBrand(record),
    category: typeof record.category === 'string' ? record.category.trim() : null,
    imageUrl: selectedVariant?.imageUrl ?? null,
    price: selectedVariant?.price ?? null,
    color: selectedVariant?.color ?? null,
    size: selectedVariant?.size ?? null,
    selectedVariant,
    variants,
  };
}

export function extractJsonLdProductDetails(html: string, url: string): JsonLdProductDetails | null {
  const blocks = parseJsonLdBlocks(html);

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const record = block as Record<string, unknown>;
    const productGroup = extractFromProductGroup(record, url);
    if (productGroup) return productGroup;

    if (Array.isArray(record['@graph'])) {
      for (const item of record['@graph']) {
        if (!item || typeof item !== 'object') continue;
        const nested = extractFromProductGroup(item as Record<string, unknown>, url);
        if (nested) return nested;
      }
    }
  }

  return null;
}

export function buildJsonLdPageContext(html: string, url: string): string {
  const details = extractJsonLdProductDetails(html, url);
  const lines: string[] = [];

  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch?.[1]?.trim()) {
    lines.push(`Page Title: ${titleMatch[1].trim()}`);
  }

  const metaDescMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaDescMatch?.[1]?.trim()) {
    lines.push(`Meta Description: ${metaDescMatch[1].trim()}`);
  }

  if (!details) return lines.join('\n');

  if (details.title) lines.push(`Product Name: ${details.title}`);
  if (details.brand) lines.push(`Brand: ${details.brand}`);
  if (details.category) lines.push(`Category: ${details.category}`);
  if (details.description) {
    lines.push(`Product Description: ${details.description.replace(/\s+/g, ' ').slice(0, 1200)}`);
  }

  if (details.selectedVariant) {
    lines.push(`Selected Variant: ${details.selectedVariant.name}`);
    if (details.selectedVariant.size) lines.push(`Selected Size: ${details.selectedVariant.size}`);
    if (details.selectedVariant.color) lines.push(`Selected Color: ${details.selectedVariant.color}`);
    if (details.selectedVariant.sku) lines.push(`SKU: ${details.selectedVariant.sku}`);
    if (details.selectedVariant.price != null) lines.push(`Variant Price: ${details.selectedVariant.price}`);
  } else if (details.size) {
    lines.push(`Size: ${details.size}`);
  }

  const availableSizes = details.variants
    .map((variant) => variant.size)
    .filter((size): size is string => Boolean(size));
  if (availableSizes.length > 0) {
    lines.push(`Available Sizes: ${[...new Set(availableSizes)].join(', ')}`);
  }

  return lines.filter(Boolean).join('\n');
}
