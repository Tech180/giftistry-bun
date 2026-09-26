/** Structured attribute keys — never free-text Note/Features prose. */
export const SPEC_FIELD_KEYS = new Set(
  [
    'Color',
    'Size',
    'ShirtSize',
    'PantsSize',
    'ShoesSize',
    'SocksSize',
    'ModelNumber',
    'StorageCapacity',
    'RAM',
  ].map((key) => key.toLowerCase())
);
