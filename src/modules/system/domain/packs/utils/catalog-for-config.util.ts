import { mergeMetadataPackCatalog } from './merge-metadata-pack-catalog.util';
import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from '../constants/metadata-packs-catalog.constant';
import { sanitizeCustomPacks } from './sanitize-custom-packs.util';
import { sanitizeEnabledPackIds } from './sanitize-enabled-pack-ids.util';

export function catalogForConfig(config: { AiCustomPacks?: unknown }): MetadataPack[] {
  return mergeMetadataPackCatalog(METADATA_PACKS_CATALOG, sanitizeCustomPacks(config.AiCustomPacks));
}

export function sanitizeEnabledPackIdsForConfig(config: {
  AiEnabledPackIds?: unknown;
  AiCustomPacks?: unknown;
}): string[] {
  return sanitizeEnabledPackIds(config.AiEnabledPackIds, catalogForConfig(config));
}
