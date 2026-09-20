import type { ImportedItemPreview } from './imported-item-preview';
import {
  isGiftistryExportMarkdown,
  normalizeImportedItem,
  parsePriceValue,
  splitExportLines,
} from './giftistry-export-detect';
import {
  classifyImportedCustomFields,
  type ImportedCustomFieldEntry,
} from './classify-imported-custom-fields.util';

export interface ParseGiftistryMdResult {
  items: ImportedItemPreview[];
  warnings: string[];
  suggestedWishlistTitle?: string;
}

const WISHLIST_TITLE_RE = /^#\s+Wishlist:\s*(.+)\s*$/i;
const ITEM_HEADING_RE = /^#\s+(.+)\s*$/;
const META_LINE_RE = /^-\s+([^:]+):\s*(.*)\s*$/i;
const CUSTOM_SECTION_RE = /^##\s+Custom\s+fields\s*$/i;
const HR_RE = /^---+\s*$/;

function parseFavorite(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '1' || v === '*';
}

function parsePriority(raw: string): number | undefined {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) return undefined;
  return Math.floor(n);
}

function parseQuantity(raw: string): number | undefined {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) return undefined;
  const qty = Math.floor(n);
  if (qty < 2 || qty > 99) return undefined;
  return qty;
}

/**
 * Deterministic Giftistry Markdown dialect parser.
 * Items are `# Heading` blocks separated by `---` or another `#` heading.
 */
export function tryParseGiftistryExportMd(text: string): ParseGiftistryMdResult | null {
  if (!isGiftistryExportMarkdown(text)) {
    return null;
  }

  const lines = splitExportLines(text);
  const warnings: string[] = [];
  const items: ImportedItemPreview[] = [];
  let suggestedWishlistTitle: string | undefined;

  let current: Partial<ImportedItemPreview> & { name?: string } | null = null;
  let inCustom = false;
  let descriptionLines: string[] = [];
  let customEntries: ImportedCustomFieldEntry[] = [];

  const commit = () => {
    if (!current?.name) {
      current = null;
      descriptionLines = [];
      inCustom = false;
      customEntries = [];
      return;
    }
    const description = descriptionLines.join('\n').trim() || undefined;
    const classified = classifyImportedCustomFields(customEntries, {
      title: current.name,
      category: current.category,
      url: current.websiteLink,
    });
    const hasCustom =
      Object.keys(classified.Predefined).length > 0 ||
      Object.keys(classified.UserDefined).length > 0;

    const normalized = normalizeImportedItem({
      ...current,
      description,
      color: classified.color,
      size: classified.size,
      customFields: hasCustom
        ? {
            Predefined: classified.Predefined,
            UserDefined: classified.UserDefined,
          }
        : undefined,
    });
    if (normalized) {
      items.push(normalized);
    }
    current = null;
    descriptionLines = [];
    inCustom = false;
    customEntries = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, '');
    const trimmed = line.trim();

    if (!trimmed) {
      if (current && !inCustom && descriptionLines.length > 0) {
        descriptionLines.push('');
      }
      continue;
    }

    const wishlistMatch = trimmed.match(WISHLIST_TITLE_RE);
    if (wishlistMatch) {
      suggestedWishlistTitle = wishlistMatch[1]?.trim() || undefined;
      continue;
    }

    if (HR_RE.test(trimmed)) {
      commit();
      continue;
    }

    if (CUSTOM_SECTION_RE.test(trimmed)) {
      inCustom = true;
      continue;
    }

    const headingMatch = trimmed.match(ITEM_HEADING_RE);
    if (headingMatch && !trimmed.toLowerCase().startsWith('# wishlist:')) {
      commit();
      current = { name: headingMatch[1]?.trim() || undefined };
      inCustom = false;
      customEntries = [];
      continue;
    }

    if (!current) {
      continue;
    }

    const metaMatch = trimmed.match(META_LINE_RE);
    if (metaMatch) {
      const keyRaw = metaMatch[1]?.trim() ?? '';
      const key = keyRaw.toLowerCase();
      const value = metaMatch[2]?.trim() ?? '';

      if (inCustom) {
        if (keyRaw && value) {
          customEntries.push({ key: keyRaw, value });
        }
        continue;
      }

      switch (key) {
        case 'category':
          current.category = value || undefined;
          break;
        case 'priority':
          current.priority = parsePriority(value);
          break;
        case 'favorite':
          current.isFavorite = parseFavorite(value);
          break;
        case 'quantity':
          current.desiredQuantity = parseQuantity(value);
          break;
        case 'price':
          current.price = parsePriceValue(value);
          break;
        case 'link':
        case 'url':
        case 'website':
          if (current.websiteLink && value) {
            warnings.push(`Item "${current.name}" has multiple links; keeping the first only.`);
          } else if (value) {
            current.websiteLink = value;
          }
          break;
        case 'retailer':
          // Retailer is informational; import preview has no retailer field.
          break;
        default:
          break;
      }
      continue;
    }

    if (!inCustom) {
      descriptionLines.push(trimmed);
    }
  }

  commit();

  if (items.length === 0) {
    return null;
  }

  return {
    items,
    warnings,
    suggestedWishlistTitle,
  };
}
