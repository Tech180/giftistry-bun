import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from '../constants/metadata-packs-catalog.constant';
import { flattenMetadataPacks } from './flatten-metadata-packs.util';

export function listCatalogPackIds(
  catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): string[] {
  return flattenMetadataPacks(catalog).map((pack) => pack.id);
}
