import { randomBytes } from 'crypto';
import { JWT_SECRET_RANDOM_BYTES } from '../constants/jwt-secret.constant';

export function generateJwtSecretValue(): string {
  return randomBytes(JWT_SECRET_RANDOM_BYTES).toString('base64url');
}
