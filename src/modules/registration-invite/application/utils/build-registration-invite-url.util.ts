import { getPublicAppUrl } from '@/common/utils/public-app-url.util';
import { DEFAULT_PUBLIC_APP_URL } from '../constants/default-public-app-url.constant';

export function buildRegistrationInviteUrl(token: string | null | undefined): string | null {
  if (!token) return null;
  const base = getPublicAppUrl() || DEFAULT_PUBLIC_APP_URL;
  return `${base.replace(/\/$/, '')}/register?invite=${token}`;
}
