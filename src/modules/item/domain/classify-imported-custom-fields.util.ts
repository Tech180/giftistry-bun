import { inferApparelSizeKey } from './coerce-apparel-size-fields.util';

export interface ImportedCustomFieldEntry {
  key: string;
  value: string;
}

export interface ClassifyImportedCustomFieldsContext {
  title?: string;
  category?: string | null;
  url?: string;
}

export interface ClassifiedImportedCustomFields {
  Predefined: Record<string, string>;
  UserDefined: Record<string, string>;
  color?: string;
  size?: string;
}

/** Canonical Predefined storage keys (case-insensitive match). */
const KNOWN_PREDEFINED_KEYS = [
  'Color',
  'PantsSize',
  'ShirtSize',
  'ShoesSize',
  'SocksSize',
  'PreferredColor',
  'ModelNumber',
  'StorageCapacity',
] as const;

const KNOWN_PREDEFINED_BY_NORMALIZED = new Map(
  KNOWN_PREDEFINED_KEYS.map((key) => [normalizeKeyLookup(key), key] as const)
);

function normalizeKeyLookup(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function canonicalPredefinedKey(raw: string): string | null {
  return KNOWN_PREDEFINED_BY_NORMALIZED.get(normalizeKeyLookup(raw)) ?? null;
}

function cleanMap(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    const k = key.trim();
    const v = String(value ?? '').trim();
    if (!k || !v) continue;
    out[k] = v;
  }
  return out;
}

function firstApparelSizeValue(predefined: Record<string, string>): string | undefined {
  for (const key of ['ShirtSize', 'PantsSize', 'ShoesSize', 'SocksSize'] as const) {
    const v = predefined[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Classify imported `- Key: Value` pairs (and optional legacy color/size)
 * into Predefined / UserDefined maps used by item metadata.
 */
export function classifyImportedCustomFields(
  entries: readonly ImportedCustomFieldEntry[],
  context: ClassifyImportedCustomFieldsContext = {},
  legacy: { color?: string; size?: string } = {}
): ClassifiedImportedCustomFields {
  const predefined: Record<string, string> = {};
  const userDefined: Record<string, string> = {};

  const title = context.title?.trim() || '';
  const category = context.category ?? null;
  const url = context.url?.trim() || '';

  for (const entry of entries) {
    const key = entry.key.trim();
    const value = entry.value.trim();
    if (!key || !value) continue;

    const predefinedKey = canonicalPredefinedKey(key);
    if (predefinedKey) {
      predefined[predefinedKey] = value;
      continue;
    }

    if (normalizeKeyLookup(key) === 'size') {
      const apparelKey = inferApparelSizeKey(value, url, title, category);
      if (apparelKey) {
        predefined[apparelKey] = value;
      } else {
        userDefined.Size = value;
      }
      continue;
    }

    userDefined[key] = value;
  }

  const legacyColor = legacy.color?.trim();
  if (legacyColor && !predefined.Color) {
    predefined.Color = legacyColor;
  }

  const legacySize = legacy.size?.trim();
  if (legacySize) {
    const hasApparel = Boolean(firstApparelSizeValue(predefined));
    const hasUserSize = Boolean(userDefined.Size?.trim());
    if (!hasApparel && !hasUserSize) {
      const apparelKey = inferApparelSizeKey(legacySize, url, title, category);
      if (apparelKey) {
        predefined[apparelKey] = legacySize;
      } else {
        userDefined.Size = legacySize;
      }
    }
  }

  const cleanedPredefined = cleanMap(predefined);
  const cleanedUserDefined = cleanMap(userDefined);
  const color = cleanedPredefined.Color || undefined;
  const size = firstApparelSizeValue(cleanedPredefined) || cleanedUserDefined.Size || undefined;

  return {
    Predefined: cleanedPredefined,
    UserDefined: cleanedUserDefined,
    color,
    size,
  };
}

export function hasClassifiedCustomFields(
  fields: Pick<ClassifiedImportedCustomFields, 'Predefined' | 'UserDefined'> | null | undefined
): boolean {
  if (!fields) return false;
  return (
    Object.keys(fields.Predefined).length > 0 || Object.keys(fields.UserDefined).length > 0
  );
}

export function cleanImportedCustomFieldsMaps(
  raw:
    | {
        Predefined?: Record<string, string | null> | null;
        UserDefined?: Record<string, string | null> | null;
      }
    | null
    | undefined
): { Predefined: Record<string, string>; UserDefined: Record<string, string> } | undefined {
  if (!raw) return undefined;
  const Predefined = cleanMap(
    Object.fromEntries(
      Object.entries(raw.Predefined ?? {}).map(([k, v]) => [k, String(v ?? '')])
    )
  );
  const UserDefined = cleanMap(
    Object.fromEntries(
      Object.entries(raw.UserDefined ?? {}).map(([k, v]) => [k, String(v ?? '')])
    )
  );
  if (Object.keys(Predefined).length === 0 && Object.keys(UserDefined).length === 0) {
    return undefined;
  }
  return { Predefined, UserDefined };
}
