import type { ExtractedMetadata } from '../domain/extracted-metadata';

export interface ScrapeCustomFieldsResult {
  predefinedFields: Record<string, string>;
  userDefinedFields: Record<string, string>;
}

function isApparelProduct(url: string, title: string, category: string | null): boolean {
  const text = `${url} ${title} ${category ?? ''}`.toLowerCase();
  return /shirt|tee|t-shirt|hoodie|pant|jeans|trouser|short|shoe|sneaker|boot|sock|apparel|clothing|t-shirts/.test(
    text
  );
}

function routeSizeToPredefinedField(
  sizeVal: string,
  url: string,
  title: string,
  category: string | null
): string | null {
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
  return 'ShirtSize';
}

export function mapScrapeToCustomFields(
  data: ExtractedMetadata,
  url: string
): ScrapeCustomFieldsResult {
  const predefinedFields: Record<string, string> = {};
  const userDefinedFields: Record<string, string> = {};

  if (data.color?.trim()) {
    predefinedFields.Color = data.color.trim();
  }

  if (data.size?.trim()) {
    const sizeVal = data.size.trim();
    const fieldKey = routeSizeToPredefinedField(sizeVal, url, data.title || '', data.category);
    if (fieldKey) {
      predefinedFields[fieldKey] = sizeVal;
    }
  }

  return { predefinedFields, userDefinedFields };
}
