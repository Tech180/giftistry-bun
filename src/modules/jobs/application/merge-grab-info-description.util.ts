type FieldMap = Record<string, string>;

interface DescriptionMetadata {
  Text?: string;
  CustomFields?: {
    Predefined?: FieldMap;
    UserDefined?: FieldMap;
  };
  DesiredQuantity?: number;
  MultiCount?: boolean;
  [key: string]: unknown;
}

function mergeString(
  extracted: string | null | undefined,
  existing: string | null | undefined,
  fallback = ''
): string {
  const next = extracted?.trim();
  if (next) return next;
  const keep = existing?.trim();
  if (keep) return keep;
  return fallback;
}

function isJsonDescription(description: string): boolean {
  return description.startsWith('{') && description.endsWith('}');
}

function parseExistingDescription(description: string | null | undefined): {
  text: string | null;
  metadata: DescriptionMetadata | null;
} {
  if (!description?.trim()) {
    return { text: null, metadata: null };
  }

  const trimmed = description.trim();
  if (!isJsonDescription(trimmed)) {
    return { text: trimmed, metadata: null };
  }

  try {
    const parsed = JSON.parse(trimmed) as DescriptionMetadata;
    if (!parsed || typeof parsed !== 'object') {
      return { text: trimmed, metadata: null };
    }
    const text =
      typeof parsed.Text === 'string' && parsed.Text.trim()
        ? parsed.Text
        : null;
    return { text, metadata: parsed };
  } catch {
    return { text: trimmed, metadata: null };
  }
}

function cleanFieldMap(map: FieldMap | null | undefined): FieldMap {
  const out: FieldMap = {};
  if (!map) return out;
  for (const [key, value] of Object.entries(map)) {
    const k = key.trim();
    const v = String(value ?? '').trim();
    if (!k || !v) continue;
    out[k] = v;
  }
  return out;
}

function readExistingQty(metadata: DescriptionMetadata | null): number | null {
  if (!metadata) return null;
  const raw = metadata.DesiredQuantity;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const n = Math.floor(raw);
  return n >= 1 ? n : null;
}

export interface MergeGrabInfoOptions {
  /** Pack qty from extract/title. Applied when > 1; never lowers an existing higher qty. */
  desiredQuantity?: number | null;
}

/**
 * Merge extract custom fields into item description JSON (FE buildGrabInfoUpdate parity).
 */
export function mergeGrabInfoDescription(
  existingDescription: string | null | undefined,
  extractDescription: string | null | undefined,
  predefinedFields?: FieldMap | null,
  userDefinedFields?: FieldMap | null,
  options: MergeGrabInfoOptions = {}
): string {
  const parsed = parseExistingDescription(existingDescription);
  const text = mergeString(extractDescription, parsed.text, '');
  const extractPredefined = cleanFieldMap(predefinedFields);
  const extractUserDefined = cleanFieldMap(userDefinedFields);
  const nextQty =
    typeof options.desiredQuantity === 'number' &&
    Number.isFinite(options.desiredQuantity) &&
    options.desiredQuantity > 1
      ? Math.floor(options.desiredQuantity)
      : null;
  const existingQty = readExistingQty(parsed.metadata);
  const mergedQty =
    nextQty != null && existingQty != null
      ? Math.max(nextQty, existingQty)
      : nextQty ?? existingQty;

  const hasExtractFields =
    Object.keys(extractPredefined).length > 0 ||
    Object.keys(extractUserDefined).length > 0;

  if (!hasExtractFields && !parsed.metadata && mergedQty == null) {
    if (text) return text;
    return existingDescription?.trim() || '';
  }

  if (!hasExtractFields && !parsed.metadata && mergedQty != null && mergedQty > 1) {
    const metadata: DescriptionMetadata = {
      ...(text ? { Text: text } : {}),
      DesiredQuantity: mergedQty,
      MultiCount: true,
    };
    return JSON.stringify(metadata);
  }

  const predefined = {
    ...cleanFieldMap(parsed.metadata?.CustomFields?.Predefined),
    ...extractPredefined,
  };
  const userDefined = {
    ...cleanFieldMap(parsed.metadata?.CustomFields?.UserDefined),
    ...extractUserDefined,
  };

  const metadata: DescriptionMetadata = {
    ...(parsed.metadata ?? {}),
    Text: text,
    CustomFields: {
      Predefined: predefined,
      UserDefined: userDefined,
    },
  };

  if (mergedQty != null && mergedQty > 1) {
    metadata.DesiredQuantity = mergedQty;
    metadata.MultiCount = true;
  }

  return JSON.stringify(metadata);
}
