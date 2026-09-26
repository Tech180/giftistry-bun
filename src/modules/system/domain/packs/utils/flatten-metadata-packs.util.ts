import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from '../constants/metadata-packs-catalog.constant';

export function flattenMetadataPacks(
  packs: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): MetadataPack[] {
  const result: MetadataPack[] = [];
  const walk = (nodes: readonly MetadataPack[]): void => {
    for (const node of nodes) {
      result.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(packs);
  return result;
}
