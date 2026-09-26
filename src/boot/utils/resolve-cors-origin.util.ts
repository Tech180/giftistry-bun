import { getEnv } from '@/common/config/utils/get-env.util';
import { getPublicAppUrl } from '@/common/utils/public-app-url.util';

export function resolveCorsOrigin(request: Request): boolean {
  if (!getEnv().isProduction) {
    return true;
  }

  const publicUrl = getPublicAppUrl();
  if (!publicUrl) {
    // First-run / unset config: allow browser Origin until PublicAppUrl is set in UI.
    return true;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  try {
    const allowedOrigin = new URL(publicUrl).origin;
    if (origin === allowedOrigin) {
      return true;
    }
    return new URL(origin).hostname === new URL(publicUrl).hostname;
  } catch {
    return false;
  }
}
