import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { listCatalogPackIds } from './list-catalog-pack-ids.util';

export function mergeMetadataPackCatalog(
  builtIn: readonly MetadataPack[],
  custom: readonly MetadataPack[]
): MetadataPack[] {
  const builtInIds = new Set(listCatalogPackIds(builtIn));
  const seen = new Set<string>();
  const extra: MetadataPack[] = [];

  for (const pack of custom) {
    if (builtInIds.has(pack.id) || seen.has(pack.id)) continue;
    seen.add(pack.id);
    extra.push({
      ...pack,
      children: undefined,
    });
  }

  return [...builtIn, ...extra];
}
