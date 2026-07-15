const APPAREL_SIZE_KEYS = ['ShirtSize', 'PantsSize', 'ShoesSize', 'SocksSize'] as const;
export type ApparelSizeKey = (typeof APPAREL_SIZE_KEYS)[number];

export interface CoerceApparelSizeInput {
  predefinedFields: Record<string, string>;
  url?: string;
  title?: string;
  category?: string | null;
  size?: string | null;
  /** When scrape already chose one size key, prefer keeping it over AI extras. */
  scrapePreferredKey?: ApparelSizeKey | null;
}

function isApparelProduct(url: string, title: string, category: string | null): boolean {
  const text = `${url} ${title} ${category ?? ''}`.toLowerCase();
  return /shirt|tee|t-shirt|hoodie|pant|jeans|trouser|short|shoe|sneaker|boot|sock|apparel|clothing|t-shirts/.test(
    text
  );
}

export function inferApparelSizeKey(
  sizeVal: string,
  url: string,
  title: string,
  category: string | null
): ApparelSizeKey | null {
  if (!isApparelProduct(url, title, category)) return null;

  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();

  if (
    urlLower.includes('shoe') ||
    urlLower.includes('boot') ||
    urlLower.includes('sneaker') ||
    titleLower.includes('shoe') ||
    titleLower.includes('sneaker')
  ) {
    return 'ShoesSize';
  }
  if (
    urlLower.includes('pant') ||
    urlLower.includes('jeans') ||
    urlLower.includes('trouser') ||
    urlLower.includes('short') ||
    titleLower.includes('pant') ||
    titleLower.includes('jeans') ||
    /^\d{2}x\d{2}$/i.test(sizeVal)
  ) {
    return 'PantsSize';
  }
  if (urlLower.includes('sock') || titleLower.includes('sock')) {
    return 'SocksSize';
  }
  if (
    urlLower.includes('shirt') ||
    urlLower.includes('tee') ||
    urlLower.includes('hoodie') ||
    titleLower.includes('shirt') ||
    titleLower.includes('tee') ||
    titleLower.includes('hoodie')
  ) {
    return 'ShirtSize';
  }

  return inferKeyFromSizeShape(sizeVal);
}

function inferKeyFromSizeShape(sizeVal: string): ApparelSizeKey | null {
  const v = sizeVal.trim();
  if (!v) return null;
  if (/^\d{2}x\d{2}$/i.test(v)) return 'PantsSize';
  if (/^\d{1,2}(\.\d)?$/.test(v) && Number(v) >= 4 && Number(v) <= 16) return 'ShoesSize';
  if (/^(xxs|xs|s|m|l|xl|xxl|xxxl|\d{1,2})$/i.test(v)) return 'ShirtSize';
  return null;
}

/**
 * Keep at most one apparel size predefined field, routed by product type / size shape.
 */
export function coerceApparelSizeFields(input: CoerceApparelSizeInput): Record<string, string> {
  const { predefinedFields, url = '', title = '', category = null, size = null, scrapePreferredKey } =
    input;
  const result = { ...predefinedFields };

  const present: ApparelSizeKey[] = APPAREL_SIZE_KEYS.filter((k) => Boolean(result[k]?.trim()));
  if (present.length === 0) return result;

  const sampleValue =
    (scrapePreferredKey && result[scrapePreferredKey]?.trim()) ||
    size?.trim() ||
    present.map((k) => result[k]).find((v) => v?.trim()) ||
    '';

  let keep: ApparelSizeKey | null =
    scrapePreferredKey && present.includes(scrapePreferredKey)
      ? scrapePreferredKey
      : inferApparelSizeKey(sampleValue, url, title, category);

  if (!keep || !present.includes(keep)) {
    const shapeMatches = present.filter((k) => inferKeyFromSizeShape(result[k] || '') === k);
    keep =
      (shapeMatches.includes('PantsSize') && 'PantsSize') ||
      (shapeMatches.includes('ShoesSize') && 'ShoesSize') ||
      (shapeMatches.includes('SocksSize') && 'SocksSize') ||
      (shapeMatches.includes('ShirtSize') && 'ShirtSize') ||
      present[0] ||
      null;
  }

  if (!keep) return result;

  const value = result[keep]?.trim() || sampleValue;
  for (const key of APPAREL_SIZE_KEYS) {
    if (key !== keep) delete result[key];
  }
  if (value) result[keep] = value;

  return result;
}
