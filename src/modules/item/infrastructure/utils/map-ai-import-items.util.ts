import type { ImportedItemPreview } from '../../domain/interfaces/imported-item-preview.interface';
import {
  normalizeImportedItem,
  parsePriceValue,
} from '../../domain/utils/giftistry-export-detect.util';

function parseStringFieldMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const k = key.trim();
    if (!k) {
      continue;
    }
    if (typeof value === 'string' && value.trim()) {
      out[k] = value.trim();
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[k] = String(value);
    }
  }
  return out;
}

function parseAiCustomFields(
  row: Record<string, unknown>
): ImportedItemPreview['customFields'] | undefined {
  const nested =
    row.CustomFields && typeof row.CustomFields === 'object' && !Array.isArray(row.CustomFields)
      ? (row.CustomFields as Record<string, unknown>)
      : null;

  const predefinedRaw =
    (nested?.Predefined as unknown) ?? row.PredefinedFields ?? row.Predefined;
  const userDefinedRaw =
    (nested?.UserDefined as unknown) ?? row.UserDefinedFields ?? row.UserDefined;

  const Predefined = parseStringFieldMap(predefinedRaw);
  const UserDefined = parseStringFieldMap(userDefinedRaw);

  if (Object.keys(Predefined).length === 0 && Object.keys(UserDefined).length === 0) {
    return undefined;
  }
  return { Predefined, UserDefined };
}

export function extractImportJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('AI import response was not valid JSON');
  }
}

export function mapAiImportItems(payload: unknown): ImportedItemPreview[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as { Items?: unknown };
  if (!Array.isArray(record.Items)) {
    return [];
  }

  const items: ImportedItemPreview[] = [];
  for (const raw of record.Items) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const row = raw as Record<string, unknown>;

    const customFields = parseAiCustomFields(row);
    const color =
      typeof row.Color === 'string'
        ? row.Color
        : typeof customFields?.Predefined.Color === 'string'
          ? customFields.Predefined.Color
          : undefined;
    const size = typeof row.Size === 'string' ? row.Size : undefined;

    const normalized = normalizeImportedItem({
      name: typeof row.Name === 'string' ? row.Name : undefined,
      category: typeof row.Category === 'string' ? row.Category : undefined,
      priority:
        row.Priority !== undefined && row.Priority !== null ? Number(row.Priority) : undefined,
      description: typeof row.Description === 'string' ? row.Description : undefined,
      price: parsePriceValue(row.Price),
      websiteLink:
        typeof row.WebsiteLink === 'string'
          ? row.WebsiteLink
          : typeof row.Url === 'string'
            ? row.Url
            : undefined,
      isFavorite: row.IsFavorite === true,
      color,
      size,
      desiredQuantity:
        row.DesiredQuantity !== undefined && row.DesiredQuantity !== null
          ? Number(row.DesiredQuantity)
          : undefined,
      customFields,
    });
    if (normalized) {
      items.push(normalized);
    }
  }
  return items;
}
