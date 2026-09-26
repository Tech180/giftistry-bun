import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from '../constants/metadata-packs-catalog.constant';
import { flattenMetadataPacks } from './flatten-metadata-packs.util';

export function findPackById(
  id: string,
  catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): MetadataPack | undefined {
  return flattenMetadataPacks(catalog).find((pack) => pack.id === id);
}
