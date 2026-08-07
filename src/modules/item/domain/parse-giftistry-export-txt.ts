import type { ImportedItemPreview } from '../imported-item-preview';
import {
  isGiftistryExportTxt,
  normalizeImportedItem,
  parsePriceValue,
  splitExportLines,
} from './giftistry-export-detect';

export interface ParseGiftistryTxtResult {
  items: ImportedItemPreview[];
  warnings: string[];
  suggestedWishlistTitle?: string;
}

const TITLE_LINE_RE =
  /^(?:★ | {2})(.+?)(?: - \$([0-9]+(?:\.[0-9]{2})?))?(?:\s+\(Priority:\s*(\d+)\))?\s*$/;
const CATEGORY_RE = /^\[([^\]]+)\]\s*$/;
const LINK_RE = /^\s{4}Link:\s+.+?\s+\((.+?)\)\s*$/;
const DESCRIPTION_RE = /^\s*Description:\s*(.*)\s*$/;
const REGISTRY_RE = /^WISHLIST REGISTRY:\s+(.+)\s*$/i;

function titleCaseWords(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

export function tryParseGiftistryExportTxt(text: string): ParseGiftistryTxtResult | null {
  if (!isGiftistryExportTxt(text)) {
    return null;
  }

  const lines = splitExportLines(text);
  const warnings: string[] = [];
  const items: ImportedItemPreview[] = [];
  let currentCategory = '';
  let suggestedWishlistTitle: string | undefined;
  let openItem: ImportedItemPreview | null = null;

  const commitOpen = () => {
    if (!openItem) return;
    const existingIndex = items.findIndex(
      (item) =>
        item.name === openItem!.name && (item.category || '') === (openItem!.category || '')
    );
    if (existingIndex >= 0) {
      if (openItem.websiteLink && !items[existingIndex].websiteLink) {
        items[existingIndex].websiteLink = openItem.websiteLink;
      } else if (openItem.websiteLink) {
        warnings.push(
          `Item "${openItem.name}" has multiple links; keeping the first only.`
        );
      }
      if (openItem.price != null && items[existingIndex].price == null) {
        items[existingIndex].price = openItem.price;
      }
      if (openItem.description && !items[existingIndex].description) {
        items[existingIndex].description = openItem.description;
      }
      if (openItem.isFavorite) {
        items[existingIndex].isFavorite = true;
      }
      openItem = null;
      return;
    }
    items.push(openItem);
    openItem = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, '');
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (/^=+$/.test(trimmed) || /^-+$/.test(trimmed)) {
      continue;
    }

    const registryMatch = trimmed.match(REGISTRY_RE);
    if (registryMatch) {
      suggestedWishlistTitle = titleCaseWords(registryMatch[1]);
      continue;
    }

    const categoryMatch = trimmed.match(CATEGORY_RE);
    if (categoryMatch) {
      commitOpen();
      currentCategory = titleCaseWords(categoryMatch[1]);
      continue;
    }

    if (/^\s*Audience:/i.test(line) || /^\s*Suggestion:/i.test(line)) {
      continue;
    }

    const descriptionMatch = line.match(DESCRIPTION_RE);
    if (descriptionMatch) {
      if (openItem && !openItem.description) {
        openItem.description = descriptionMatch[1].trim() || undefined;
      }
      continue;
    }

    const linkMatch = line.match(LINK_RE);
    if (linkMatch) {
      if (openItem) {
        const url = linkMatch[1].trim();
        if (!openItem.websiteLink) {
          openItem.websiteLink = url || undefined;
        } else if (url) {
          warnings.push(
            `Item "${openItem.name}" has multiple links; keeping the first only.`
          );
        }
      }
      continue;
    }

    const titleMatch = line.match(TITLE_LINE_RE);
    if (titleMatch) {
      commitOpen();
      const name = titleMatch[1].trim();
      const price = titleMatch[2] ? parsePriceValue(`$${titleMatch[2]}`) : undefined;
      const priority = titleMatch[3] ? Number(titleMatch[3]) : undefined;
      const isFavorite = line.startsWith('★ ');
      openItem = normalizeImportedItem({
        name,
        category: currentCategory || undefined,
        priority,
        price: price ?? undefined,
        isFavorite,
      });
      continue;
    }
  }

  commitOpen();

  if (items.length === 0) {
    warnings.push('Giftistry TXT export contained no importable items.');
  }

  return {
    items,
    warnings,
    suggestedWishlistTitle,
  };
}
