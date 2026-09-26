import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import {
  BOOKS_PACK,
  CLOTHING_PACK,
  KITCHEN_PACK,
  MOVIES_PACK,
  TECHNOLOGY_PACK,
} from '../packs/index';

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
