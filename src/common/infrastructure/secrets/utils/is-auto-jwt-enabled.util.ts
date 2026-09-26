import { JWT_AUTO_DISABLED_VALUES } from '../constants/jwt-secret.constant';

export function isAutoJwtEnabled(): boolean {
  const raw = Bun.env.GIFTISTRY_AUTO_JWT_SECRET;
  if (raw === undefined || raw.trim() === '') {
    return true;
  }
  return !JWT_AUTO_DISABLED_VALUES.has(raw.trim().toLowerCase());
}
