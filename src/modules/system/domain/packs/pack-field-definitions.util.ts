import { isAlwaysOnPackMatch } from './is-always-on-pack-match.util';
import type { MetadataPack, MetadataPackField } from './metadata-pack.interface';
import { METADATA_PACKS_CATALOG, flattenMetadataPacks } from './metadata-packs.catalog';

function normalizeCategoryToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return (
    trimmed
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || ''
  );
}

export interface PackFieldForCategory {
  packId: string;
  field: MetadataPackField;
}

export interface CollectEnabledPackFieldsInput {
  enabledPackIds: readonly string[];
  category: string;
  catalog?: readonly MetadataPack[];
}

export function collectEnabledPackFieldsForCategory(
  input: CollectEnabledPackFieldsInput
): PackFieldForCategory[] {
  const catalog = input.catalog ?? METADATA_PACKS_CATALOG;
  const enabled = new Set(input.enabledPackIds);
  const normalizedCategory = normalizeCategoryToken(input.category);
  if (!normalizedCategory) return [];

  const packs = flattenMetadataPacks(catalog).filter((pack) => {
    if (!enabled.has(pack.id) || pack.fields.length === 0) return false;
    if (isAlwaysOnPackMatch(pack.match)) return true;
    return pack.match.categories.some(
      (entry) => normalizeCategoryToken(entry) === normalizedCategory
    );
  });

  const seen = new Set<string>();
  const result: PackFieldForCategory[] = [];
  for (const pack of packs) {
    for (const field of pack.fields) {
      if (seen.has(field.key)) continue;
      seen.add(field.key);
      result.push({ packId: pack.id, field });
    }
  }
  return result;
}
