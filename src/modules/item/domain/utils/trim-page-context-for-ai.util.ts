import type { AiMetadataExtractionOptions } from '@/modules/system';

const PRIORITY_LINE_PREFIXES = [
  'url:',
  'store name:',
  'store / website:',
  'retailer:',
  'page title:',
  'product name:',
  'brand:',
  'asin:',
  'sku:',
  'variant price:',
  'selected variant:',
  'selected size:',
  'selected color:',
  'available sizes:',
  'size:',
  'meta description:',
  'product description:',
  'scraped facts:',
] as const;

function isPriorityLine(line: string): boolean {
  const lower = line.trim().toLowerCase();
  return PRIORITY_LINE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Line-aware char cap for AI page context. Keeps priority lines first, then fills
 * remaining budget with other lines in original order.
 */
export function trimPageContextForAi(
  pageContext: string,
  extraction: Pick<AiMetadataExtractionOptions, 'pageContextMaxChars'>
): string {
  const maxChars = extraction.pageContextMaxChars;
  if (maxChars == null || maxChars <= 0) {
    return pageContext;
  }

  const trimmed = pageContext.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  const lines = trimmed.split('\n').map((line) => line.trimEnd()).filter(Boolean);
  const priority: string[] = [];
  const rest: string[] = [];
  for (const line of lines) {
    if (isPriorityLine(line)) {
      priority.push(line);
    } else {
      rest.push(line);
    }
  }

  const selected: string[] = [];
  let used = 0;

  const tryAdd = (line: string): boolean => {
    const next = used === 0 ? line.length : used + 1 + line.length;
    if (next > maxChars) {
      return false;
    }
    selected.push(line);
    used = next;
    return true;
  };

  for (const line of priority) {
    if (!tryAdd(line)) {
      break;
    }
  }
  for (const line of rest) {
    if (!tryAdd(line)) {
      break;
    }
  }

  if (selected.length === 0 && priority[0]) {
    return priority[0].slice(0, maxChars);
  }

  return selected.join('\n');
}
