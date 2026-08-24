import type { ItemDescriptionMetadata } from '@/modules/item/domain/item-description.util';

type FieldMap = Record<string, string>;

interface DescriptionMetadata {
  Text?: string | null;
  CustomFields?: {
    Predefined?: FieldMap;
    UserDefined?: FieldMap;
  };
  DesiredQuantity?: number;
  MultiCount?: boolean;
  IsFavorite?: boolean;
  IsPinned?: boolean;
  OtherUsersCanSee?: boolean;
  Variations?: ItemDescriptionMetadata['Variations'];
  LinkedItemIds?: string[];
  RelatedItemIds?: string[];
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

function cleanFieldMap(map: FieldMap | Record<string, string | null> | null | undefined): FieldMap {
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

function fromItemMetadata(metadata: ItemDescriptionMetadata | null | undefined): DescriptionMetadata | null {
  if (!metadata) return null;
  return {
    Text: metadata.Text,
    CustomFields: {
      Predefined: cleanFieldMap(metadata.CustomFields?.Predefined),
      UserDefined: cleanFieldMap(metadata.CustomFields?.UserDefined),
    },
    DesiredQuantity: metadata.DesiredQuantity,
    MultiCount: metadata.MultiCount,
    IsFavorite: metadata.IsFavorite,
    IsPinned: metadata.IsPinned,
    OtherUsersCanSee: metadata.OtherUsersCanSee,
    Variations: metadata.Variations,
    LinkedItemIds: metadata.LinkedItemIds,
    RelatedItemIds: metadata.RelatedItemIds,
  };
}

function toItemMetadata(metadata: DescriptionMetadata, text: string | null): ItemDescriptionMetadata {
  const result: ItemDescriptionMetadata = {
    Text: text,
    CustomFields: {
      Predefined: cleanFieldMap(metadata.CustomFields?.Predefined),
      UserDefined: cleanFieldMap(metadata.CustomFields?.UserDefined),
    },
  };
  if (metadata.DesiredQuantity != null) result.DesiredQuantity = metadata.DesiredQuantity;
  if (metadata.MultiCount === true) result.MultiCount = true;
  if (metadata.IsFavorite === true) result.IsFavorite = true;
  if (metadata.IsPinned === true) result.IsPinned = true;
  if (metadata.OtherUsersCanSee !== undefined) result.OtherUsersCanSee = metadata.OtherUsersCanSee;
  if (metadata.Variations?.length) result.Variations = metadata.Variations;
  if (metadata.LinkedItemIds?.length) result.LinkedItemIds = metadata.LinkedItemIds;
  if (metadata.RelatedItemIds?.length) result.RelatedItemIds = metadata.RelatedItemIds;
  return result;
}

export interface MergeGrabInfoOptions {
  /** Pack qty from extract/title. Applied when > 1; never lowers an existing higher qty. */
  desiredQuantity?: number | null;
  /** Column-backed metadata from list/get (used when description is already plain text). */
  existingMetadata?: ItemDescriptionMetadata | null;
}

export interface MergeGrabInfoResult {
  text: string | null;
  metadata: ItemDescriptionMetadata | null;
}

/**
 * Merge extract custom fields with existing description JSON and/or column metadata.
 */
export function mergeGrabInfoMetadata(
  existingDescription: string | null | undefined,
  extractDescription: string | null | undefined,
  predefinedFields?: FieldMap | null,
  userDefinedFields?: FieldMap | null,
  options: MergeGrabInfoOptions = {}
): MergeGrabInfoResult {
  const parsed = parseExistingDescription(existingDescription);
  const columnMeta = fromItemMetadata(options.existingMetadata);
  const baseMeta: DescriptionMetadata = {
    ...(columnMeta ?? {}),
    ...(parsed.metadata ?? {}),
  };
  const hasBaseMeta =
    parsed.metadata != null ||
    columnMeta != null;

  const existingText =
    parsed.text ??
    (typeof columnMeta?.Text === 'string' ? columnMeta.Text : null) ??
    null;
  const text = mergeString(extractDescription, existingText, '') || null;

  const extractPredefined = cleanFieldMap(predefinedFields);
  const extractUserDefined = cleanFieldMap(userDefinedFields);
  const nextQty =
    typeof options.desiredQuantity === 'number' &&
    Number.isFinite(options.desiredQuantity) &&
    options.desiredQuantity > 1
      ? Math.floor(options.desiredQuantity)
      : null;
  const existingQty = readExistingQty(hasBaseMeta ? baseMeta : null);
  const mergedQty =
    nextQty != null && existingQty != null
      ? Math.max(nextQty, existingQty)
      : nextQty ?? existingQty;

  const hasExtractFields =
    Object.keys(extractPredefined).length > 0 ||
    Object.keys(extractUserDefined).length > 0;

  if (!hasExtractFields && !hasBaseMeta && mergedQty == null) {
    return { text, metadata: null };
  }

  if (!hasExtractFields && !hasBaseMeta && mergedQty != null && mergedQty > 1) {
    return {
      text,
      metadata: {
        Text: text,
        DesiredQuantity: mergedQty,
        MultiCount: true,
        CustomFields: { Predefined: {}, UserDefined: {} },
      },
    };
  }

  const predefined = {
    ...cleanFieldMap(baseMeta.CustomFields?.Predefined),
    ...extractPredefined,
  };
  const userDefined = {
    ...cleanFieldMap(baseMeta.CustomFields?.UserDefined),
    ...extractUserDefined,
  };

  const metadata: DescriptionMetadata = {
    ...baseMeta,
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

  const hasAnyFields =
    Object.keys(predefined).length > 0 ||
    Object.keys(userDefined).length > 0 ||
    metadata.DesiredQuantity != null ||
    metadata.MultiCount === true ||
    metadata.IsFavorite === true ||
    metadata.IsPinned === true ||
    metadata.OtherUsersCanSee !== undefined ||
    (metadata.Variations?.length ?? 0) > 0 ||
    (metadata.LinkedItemIds?.length ?? 0) > 0 ||
    (metadata.RelatedItemIds?.length ?? 0) > 0;

  if (!hasAnyFields) {
    return { text, metadata: null };
  }

  return { text, metadata: toItemMetadata(metadata, text) };
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
  const { text, metadata } = mergeGrabInfoMetadata(
    existingDescription,
    extractDescription,
    predefinedFields,
    userDefinedFields,
    options
  );

  if (!metadata) {
    if (text) return text;
    return existingDescription?.trim() || '';
  }

  return JSON.stringify({
    ...metadata,
    Text: text,
  });
}
