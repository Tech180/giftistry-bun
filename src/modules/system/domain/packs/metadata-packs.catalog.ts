import type { MetadataPack } from './metadata-pack.interface';
import {
  BOOKS_PACK,
  CLOTHING_PACK,
  KITCHEN_PACK,
  MOVIES_PACK,
  TECHNOLOGY_PACK,
} from './packs/index';

export const METADATA_PACKS_CATALOG: MetadataPack[] = [
  TECHNOLOGY_PACK,
  BOOKS_PACK,
  MOVIES_PACK,
  CLOTHING_PACK,
  KITCHEN_PACK,
];

export const DEFAULT_ENABLED_PACK_IDS: readonly string[] = [
  'technology',
  'technology.cpu',
  'books',
  'movies',
  'clothing',
  'kitchen',
];

export function flattenMetadataPacks(packs: readonly MetadataPack[] = METADATA_PACKS_CATALOG): MetadataPack[] {
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

export function listCatalogPackIds(catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG): string[] {
  return flattenMetadataPacks(catalog).map((pack) => pack.id);
}

export function findPackById(
  id: string,
  catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): MetadataPack | undefined {
  return flattenMetadataPacks(catalog).find((pack) => pack.id === id);
}
