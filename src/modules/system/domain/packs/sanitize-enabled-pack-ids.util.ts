import {
  DEFAULT_ENABLED_PACK_IDS,
  listCatalogPackIds,
  METADATA_PACKS_CATALOG,
} from './metadata-packs.catalog';
import type { MetadataPack } from './metadata-pack.interface';

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

/**
 * Resolve the enabled pack id list for enrich / settings view.
 * Missing or malformed values use the new-install default (Technology + CPU).
 * An explicit empty array means no packs.
 */
export function sanitizeEnabledPackIds(
  value: unknown,
  catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): string[] {
  if (value === undefined || value === null || !Array.isArray(value)) {
    return [...DEFAULT_ENABLED_PACK_IDS];
  }
  return uniqueValidPackIds(value, catalog);
}
