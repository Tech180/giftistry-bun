import { getPublicAppUrl } from '@/common/utils/public-app-url.util';

export function buildRegistrationInviteUrl(token: string | null | undefined): string | null {
  if (!token) return null;
  const base = getPublicAppUrl() || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/register?invite=${token}`;
}
