import type { SafeFetchOptions } from '../interfaces/safe-fetch-options.interface';
import type { SafeFetchResult } from '../interfaces/safe-fetch-result.interface';
import {
  DEFAULT_SAFE_FETCH_ALLOWED_PORTS,
  DEFAULT_SAFE_FETCH_MAX_HTML_BYTES,
  DEFAULT_SAFE_FETCH_MAX_REDIRECTS,
  SAFE_FETCH_HTML_CONTENT_TYPES,
} from '../constants/safe-fetch-defaults.constant';
import { resolvePublicHost } from './resolve-public-host.util';
import { isPrivateNetworkAddress } from '../../../domain/utils/is-private-network-address.util';
import { readLimitedBody } from './read-limited-body.util';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

function parseAndValidateUrl(
  raw: string,
  allowedPorts: ReadonlySet<number>
): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`Invalid URL: ${raw}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError(`Unsupported protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError('URLs with credentials are not allowed');
  }
  if (!parsed.hostname) {
    throw new UnsafeUrlError('URL missing hostname');
  }
  if (isPrivateNetworkAddress(parsed.hostname)) {
    throw new UnsafeUrlError(`Private hostname not allowed: ${parsed.hostname}`);
  }

  const port = parsed.port
    ? Number(parsed.port)
    : parsed.protocol === 'https:'
      ? 443
      : 80;
  if (!allowedPorts.has(port)) {
    throw new UnsafeUrlError(`Port ${port} is not allowed`);
  }

  return parsed;
}

/**
 * SSRF-safe fetch with manual redirects, DNS validation per hop, and body size cap.
 * Non-2xx responses return body+status instead of throwing.
 *
 * Residual risk: Bun fetch cannot pin the TCP peer to the validated DNS answer while
 * preserving SNI/cert validation. Mitigation is validate-then-fetch plus Playwright
 * serverAddr checks (see install-playwright-network-guard).
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_SAFE_FETCH_MAX_HTML_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_SAFE_FETCH_MAX_REDIRECTS;
  const allowedPorts = options.allowedPorts ?? DEFAULT_SAFE_FETCH_ALLOWED_PORTS;
  const allowlist = options.contentTypeAllowlist ?? SAFE_FETCH_HTML_CONTENT_TYPES;
  const enforceHtml = options.enforceHtmlContentType !== false;
  const method = options.method ?? 'GET';

  let current = parseAndValidateUrl(url, allowedPorts);
  await resolvePublicHost(current.hostname, options.resolver);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(current.href, {
      method,
      headers: options.headers,
      redirect: 'manual',
      signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new UnsafeUrlError(`Redirect ${response.status} without Location`);
      }
      if (hop === maxRedirects) {
        throw new UnsafeUrlError(`Too many redirects (max ${maxRedirects})`);
      }
      const next = new URL(location, current);
      current = parseAndValidateUrl(next.href, allowedPorts);
      await resolvePublicHost(current.hostname, options.resolver);
      continue;
    }

    const contentType = response.headers.get('content-type');
    if (enforceHtml && response.ok && contentType) {
      const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
      if (mime && !allowlist.some((allowed) => mime === allowed || mime.startsWith(`${allowed}+`))) {
        // Allow empty/missing type; reject clearly unsupported types
        if (!mime.startsWith('text/') && !mime.includes('html') && !mime.includes('json')) {
          throw new UnsafeUrlError(`Unsupported content type: ${mime}`);
        }
      }
    }

    const limited = await readLimitedBody(response, maxBytes);
    return {
      status: response.status,
      finalUrl: response.url || current.href,
      contentType,
      body: limited.body,
      truncated: limited.truncated,
    };
  }

  throw new UnsafeUrlError('Redirect loop');
}

export async function safeFetchBytes(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult & { bytes: Uint8Array }> {
  const maxBytes = options.maxBytes ?? DEFAULT_SAFE_FETCH_MAX_HTML_BYTES;
  const allowedPorts = options.allowedPorts ?? DEFAULT_SAFE_FETCH_ALLOWED_PORTS;
  let current = parseAndValidateUrl(url, allowedPorts);
  await resolvePublicHost(current.hostname, options.resolver);

  const maxRedirects = options.maxRedirects ?? DEFAULT_SAFE_FETCH_MAX_REDIRECTS;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(current.href, {
      method: options.method ?? 'GET',
      headers: options.headers,
      redirect: 'manual',
      signal: options.timeoutMs ? AbortSignal.timeout(options.timeoutMs) : undefined,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new UnsafeUrlError(`Redirect ${response.status} without Location`);
      }
      if (hop === maxRedirects) {
        throw new UnsafeUrlError(`Too many redirects (max ${maxRedirects})`);
      }
      current = parseAndValidateUrl(new URL(location, current).href, allowedPorts);
      await resolvePublicHost(current.hostname, options.resolver);
      continue;
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    const truncated = buffer.byteLength > maxBytes;
    const bytes = truncated ? buffer.subarray(0, maxBytes) : buffer;
    return {
      status: response.status,
      finalUrl: response.url || current.href,
      contentType: response.headers.get('content-type'),
      body: '',
      truncated,
      bytes,
    };
  }

  throw new UnsafeUrlError('Redirect loop');
}
