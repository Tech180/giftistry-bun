/**
 * Explicit public (unauthenticated) HTTP operations.
 * Keys use HTTPie path form: METHOD + space + path with <param> placeholders.
 */

export function overlayKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/** Convert OpenAPI `{param}` path segments to HTTPie `<param>`. */
export function openApiPathToHttpie(path: string): string {
  return path.replace(/\{([^}]+)\}/g, '<$1>');
}

const PUBLIC_KEYS = new Set<string>([
  overlayKey('GET', '/health'),
  overlayKey('GET', '/api/system/status'),
  overlayKey('POST', '/api/system/setup'),
  overlayKey('POST', '/api/auth/signup'),
  overlayKey('POST', '/api/auth/login'),
  overlayKey('POST', '/api/auth/passkey/login/options'),
  overlayKey('POST', '/api/auth/passkey/login/verify'),
  overlayKey('POST', '/api/auth/passkey/check'),
  overlayKey('POST', '/api/auth/2fa/login'),
  overlayKey('GET', '/api/auth/oauth/authorize'),
  overlayKey('GET', '/api/auth/oauth/callback'),
  overlayKey('GET', '/api/users/<userId>/preview'),
  overlayKey('GET', '/api/themes/core/css'),
  overlayKey('GET', '/api/themes/<theme>/<appearance>/css'),
  overlayKey('GET', '/api/invites/link/<token>'),
  overlayKey('GET', '/api/invites/link/<token>/preview'),
  overlayKey('POST', '/api/invites/link/<token>/preview'),
]);

export function isPublicRoute(method: string, httpiePath: string): boolean {
  return PUBLIC_KEYS.has(overlayKey(method, httpiePath));
}

export function listPublicRouteKeys(): readonly string[] {
  return [...PUBLIC_KEYS];
}
