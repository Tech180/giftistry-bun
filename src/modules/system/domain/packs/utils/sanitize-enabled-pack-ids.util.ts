import {
  DEFAULT_ENABLED_PACK_IDS,
  METADATA_PACKS_CATALOG,
} from '../constants/metadata-packs-catalog.constant';
import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { listCatalogPackIds } from './list-catalog-pack-ids.util';

function uniqueValidPackIds(value: unknown, catalog: readonly MetadataPack[]): string[] {
  const valid = new Set(listCatalogPackIds(catalog));
  const seen = new Set<string>();
  const result: string[] = [];
  if (!Array.isArray(value)) return result;
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const id = item.trim();
    if (!id || !valid.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function sanitizeEnabledPackIds(
  value: unknown,
  catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): string[] {
  if (value === undefined || value === null) {
    return [...DEFAULT_ENABLED_PACK_IDS];
  }
  return uniqueValidPackIds(value, catalog);
}
