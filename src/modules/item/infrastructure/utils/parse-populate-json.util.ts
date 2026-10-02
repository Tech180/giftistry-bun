import type { ExtractedMetadata } from '../../domain/interfaces/extracted-metadata.interface';
import { promoteProseCustomFieldsToDescription } from '../../domain/utils/promote-prose-custom-fields-to-description.util';
import { sanitizeProductDescription } from '../../domain/utils/sanitize-product-description.util';
import { PopulateJsonValidationError } from '../errors/populate-json-validation.error';
import { isUnclosedJsonObject } from './is-unclosed-json-object.util';

/** Pulls the first JSON object from model prose (fenced or embedded). */
export function extractFirstJsonObject(text: string): string {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '');
    clean = clean.replace(/\s*```$/, '');
    clean = clean.trim();
  }

  if (clean.startsWith('{')) {
    return clean;
  }

  const start = clean.indexOf('{');
  if (start === -1) {
    return clean;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < clean.length; i += 1) {
    const ch = clean[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      depth += 1;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return clean.slice(start, i + 1);
      }
    }
  }

  return clean.slice(start);
}

function parseFieldMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) {
      result[key] = val.trim();
      continue;
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
      result[key] = String(val);
      continue;
    }
    if (Array.isArray(val)) {
      const joined = val
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter(Boolean)
        .join(', ');
      if (joined) {
        result[key] = joined;
      }
    }
  }
  return result;
}

function assertStringOrNull(value: unknown, field: string): void {
  if (value === null || value === undefined) return;
  if (typeof value !== 'string') {
    throw new PopulateJsonValidationError(`${field} must be a string when present`);
  }
}

function assertFieldMap(value: unknown, field: string): void {
  if (value === null || value === undefined) return;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new PopulateJsonValidationError(`${field} must be an object when present`);
  }
}

export function validatePopulateJsonShape(parsed: Record<string, unknown>): void {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PopulateJsonValidationError('Populate JSON root must be an object');
  }

  assertStringOrNull(parsed.Title, 'Title');
  assertStringOrNull(parsed.Description, 'Description');
  assertStringOrNull(parsed.Color, 'Color');
  assertStringOrNull(parsed.Size, 'Size');
  assertStringOrNull(parsed.ImageUrl, 'ImageUrl');
  assertStringOrNull(parsed.Brand, 'Brand');
  assertFieldMap(parsed.PredefinedFields, 'PredefinedFields');
  assertFieldMap(parsed.UserDefinedFields, 'UserDefinedFields');

  const price = parsed.Price;
  if (
    price !== null &&
    price !== undefined &&
    typeof price !== 'number' &&
    typeof price !== 'string'
  ) {
    throw new PopulateJsonValidationError('Price must be a number or string when present');
  }
}

export function parsePopulateJson(text: string): ExtractedMetadata {
  const clean = extractFirstJsonObject(text);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(clean) as Record<string, unknown>;
  } catch {
    const rawLength = text.length;
    if (!clean.trim()) {
      throw new PopulateJsonValidationError('Populate JSON response was empty', {
        kind: 'empty',
        rawLength,
      });
    }
    if (isUnclosedJsonObject(clean)) {
      throw new PopulateJsonValidationError('Populate JSON was truncated (unclosed object)', {
        kind: 'truncated',
        rawLength,
      });
    }
    throw new PopulateJsonValidationError('Populate JSON is not valid JSON', {
      kind: 'malformed',
      rawLength,
    });
  }
  validatePopulateJsonShape(parsed);
  const priceRaw = parsed.Price;
  let price: number | null = null;
  if (typeof priceRaw === 'number' && !Number.isNaN(priceRaw)) {
    price = priceRaw;
  } else if (typeof priceRaw === 'string') {
    const num = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
    price = Number.isNaN(num) ? null : num;
  }

  const str = (key: string) => {
    const val = parsed[key];
    return typeof val === 'string' && val.trim() ? val.trim() : null;
  };

  const predefinedFields = parseFieldMap(parsed.PredefinedFields);
  const userDefinedFields = parseFieldMap(parsed.UserDefinedFields);
  const topLevelBrand = str('Brand');
  if (topLevelBrand && !userDefinedFields.Brand) {
    userDefinedFields.Brand = topLevelBrand;
  }
  const color = str('Color');
  const size = str('Size');

  const qtyRaw = parsed.DesiredQuantity;
  let desiredQuantity: number | null = null;
  if (typeof qtyRaw === 'number' && Number.isFinite(qtyRaw)) {
    desiredQuantity = Math.floor(qtyRaw);
  } else if (typeof qtyRaw === 'string' && qtyRaw.trim()) {
    const n = Number.parseInt(qtyRaw.trim(), 10);
    desiredQuantity = Number.isFinite(n) ? n : null;
  }
  if (desiredQuantity != null && (desiredQuantity < 2 || desiredQuantity > 99)) {
    desiredQuantity = null;
  }

  const promoted = promoteProseCustomFieldsToDescription({
    title: str('Title') || '',
    price,
    description: str('Description'),
    color,
    size,
    category: null,
    imageUrl: str('ImageUrl'),
    predefinedFields,
    userDefinedFields,
    desiredQuantity,
  });

  return {
    ...promoted,
    description: sanitizeProductDescription(promoted.description, {
      predefinedFields: promoted.predefinedFields,
      userDefinedFields: promoted.userDefinedFields,
      color: promoted.color,
      size: promoted.size,
    }),
  };
}

/** Test helper — same path as live populate JSON parsing. */
export function parsePopulateJsonForTests(text: string): ExtractedMetadata {
  return parsePopulateJson(text);
}
