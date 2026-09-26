/** Known-weak JWT values rejected in production. */
export const WEAK_JWT_DEFAULTS = new Set([
  'local_secret_key_for_giftistry',
  'changeme',
  'secret',
  'jwt_secret',
]);
