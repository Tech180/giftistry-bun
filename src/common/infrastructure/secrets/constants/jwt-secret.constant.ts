/** Env truthy-negation tokens for GIFTISTRY_AUTO_JWT_SECRET. */
export const JWT_AUTO_DISABLED_VALUES = new Set(['0', 'false', 'no', 'off']);

/** Fallback when GIFTISTRY_STATE_DIR is unset. */
export const DEFAULT_GIFTISTRY_STATE_DIR = '/var/lib/giftistry';

/** Filename under the state directory for the auto-persisted JWT secret. */
export const JWT_SECRET_FILENAME = 'jwt_secret';

/** Byte length used for auto-generated JWT secrets. */
export const JWT_SECRET_RANDOM_BYTES = 48;
