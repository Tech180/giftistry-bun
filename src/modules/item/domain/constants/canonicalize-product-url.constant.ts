export const STRIP_QUERY_PREFIXES = ['utm_', 'utm-'] as const;

export const STRIP_QUERY_KEYS = new Set([
  'gclid',
  'fbclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
  'ref',
  'referrer',
]);

export const KEEP_QUERY_KEYS = new Set([
  'variant',
  'sku',
  'color',
  'size',
  'selected_variant',
  'variant_id',
]);
