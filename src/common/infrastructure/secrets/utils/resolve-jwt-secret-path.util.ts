import { join } from 'path';
import {
  DEFAULT_GIFTISTRY_STATE_DIR,
  JWT_SECRET_FILENAME,
} from '../constants/jwt-secret.constant';

/** Path for auto-persisted JWT: GIFTISTRY_JWT_SECRET_PATH or ${GIFTISTRY_STATE_DIR}/jwt_secret. */
export function resolveJwtSecretPath(): string {
  const explicit = Bun.env.GIFTISTRY_JWT_SECRET_PATH?.trim();
  if (explicit) {
    return explicit;
  }
  const stateDir = Bun.env.GIFTISTRY_STATE_DIR?.trim() || DEFAULT_GIFTISTRY_STATE_DIR;
  return join(stateDir, JWT_SECRET_FILENAME);
}
