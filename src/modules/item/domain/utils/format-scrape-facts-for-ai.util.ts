import type { ExtractedMetadata } from '../interfaces/extracted-metadata.interface';

function compactFieldMap(map: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!map) {
    return undefined;
  }
  const entries = Object.entries(map).filter(([, value]) => value.trim());
  if (entries.length === 0) {
    return undefined;
  }
  return Object.fromEntries(entries.map(([key, value]) => [key, value.trim()]));
}

/** Compact scrape facts block prepended to page context for non-full presets. */
export function formatScrapeFactsForAi(data: ExtractedMetadata): string {
  const facts: Record<string, unknown> = {};
  if (data.title?.trim()) {
    facts.title = data.title.trim();
  }
  if (data.price != null) {
    facts.price = data.price;
  }
  if (data.color?.trim()) {
    facts.color = data.color.trim();
  }
  if (data.size?.trim()) {
    facts.size = data.size.trim();
  }
  if (data.category?.trim()) {
    facts.category = data.category.trim();
  }
  if (data.imageUrl?.trim()) {
    facts.imageUrl = data.imageUrl.trim();
  }
  if (data.description?.trim()) {
    facts.description = data.description.trim().slice(0, 400);
  }
  const predefined = compactFieldMap(data.predefinedFields);
  if (predefined) {
    facts.predefinedFields = predefined;
  }
  const userDefined = compactFieldMap(data.userDefinedFields);
  if (userDefined) {
    facts.userDefinedFields = userDefined;
  }

  if (Object.keys(facts).length === 0) {
    return '';
  }

  return `Scraped facts (prefer when page context conflicts):\n${JSON.stringify(facts)}`;
}

export function shouldAttachScrapeFacts(
  scrape: { diagnostics: { blocked?: boolean } },
  data: ExtractedMetadata
): boolean {
  if (scrape.diagnostics.blocked) {
    return false;
  }
  return formatScrapeFactsForAi(data).length > 0;
}
