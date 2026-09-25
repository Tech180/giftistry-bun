import { isIP } from 'net';
import { AppError } from '@/common/middlewares/error.middleware';
import { getPublicAppUrl } from '@/common/utils/public-app-url.util';

const RP_ID_HINT =
  'Set Public App URL to a hostname (localhost or a real domain) and open the app there. IP addresses cannot be used for WebAuthn.';

/** Pure: derive WebAuthn rp.id (hostname only) from a public app URL. */
export function webAuthnRpIdFromPublicAppUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new AppError(
      `Public App URL is required for passkeys. ${RP_ID_HINT}`,
      400,
      'BAD_REQUEST'
    );
  }

  let hostname: string;
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    throw new AppError(
      `Public App URL is invalid. ${RP_ID_HINT}`,
      400,
      'BAD_REQUEST'
    );
  }

  if (!hostname) {
    throw new AppError(
      `Public App URL is missing a hostname. ${RP_ID_HINT}`,
      400,
      'BAD_REQUEST'
    );
  }

  // Strip IPv6 brackets if present (URL.hostname usually returns without them).
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    throw new AppError(
      `Public App URL hostname "${host}" is an IP address. ${RP_ID_HINT}`,
      400,
      'BAD_REQUEST'
    );
  }

  return host.toLowerCase();
}

/** Resolve rp.id from the configured public app URL. */
export function getWebAuthnRpId(): string {
  return webAuthnRpIdFromPublicAppUrl(getPublicAppUrl());
}
