import { APPAREL_SIZE_KEYS } from './apparel-size-keys.constant';

/** Canonical Predefined storage keys (case-insensitive match on import). */
export const KNOWN_PREDEFINED_KEYS = [
  'Color',
  ...APPAREL_SIZE_KEYS,
  'PreferredColor',
  'ModelNumber',
  'StorageCapacity',
] as const;
