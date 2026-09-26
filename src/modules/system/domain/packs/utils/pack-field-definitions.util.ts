import { isAlwaysOnPackMatch } from './is-always-on-pack-match.util';
import { METADATA_PACKS_CATALOG } from '../constants/metadata-packs-catalog.constant';
import type { PackFieldForCategory } from '../interfaces/pack-field-for-category.interface';
import type { CollectEnabledPackFieldsInput } from '../interfaces/collect-enabled-pack-fields-input.interface';
import { flattenMetadataPacks } from './flatten-metadata-packs.util';
import { normalizeCategoryToken } from './normalize-category-token.util';

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
