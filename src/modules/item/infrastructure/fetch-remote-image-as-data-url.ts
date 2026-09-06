import {
  IMAGE_DATA_URL_ALLOWED_TYPES,
  ITEM_PHOTO_MAX_BYTES,
} from '@/common/utils/image-data-url.util';
import type { RemoteImageFetcher } from '../domain/ports/remote-image-fetcher.port';

const FETCH_TIMEOUT_MS = 10_000;

const MIME_BY_MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP checked below
];

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  // IPv4
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const parts = ipv4.slice(1).map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  // IPv6 / IPv4-mapped rough checks
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  if (host.includes('127.0.0.1')) return true;

  return false;
}

/** Exported for unit tests. */
export function assertSafeRemoteImageUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname) return null;
  if (isPrivateHostname(parsed.hostname)) return null;
  return parsed;
}

function sniffMime(bytes: Uint8Array, contentType: string | null): string | null {
  for (const entry of MIME_BY_MAGIC) {
    if (entry.bytes.every((b, i) => bytes[i] === b)) {
      if (entry.mime === 'image/webp') {
        // RIFF....WEBP
        if (bytes.length < 12) continue;
        const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
        if (tag !== 'WEBP') continue;
      }
      return entry.mime;
    }
  }

  if (contentType) {
    const mime = contentType.split(';')[0]?.trim().toLowerCase() || '';
    if ((IMAGE_DATA_URL_ALLOWED_TYPES as readonly string[]).includes(mime)) {
      return mime;
    }
  }
  return null;
}

export class FetchRemoteImageAsDataUrl implements RemoteImageFetcher {
  async fetchAsDataUrl(url: string): Promise<string | null> {
    const safeUrl = assertSafeRemoteImageUrl(url);
    if (!safeUrl) {
      console.log(`[RemoteImage] rejected url=${url}`);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(safeUrl.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { Accept: 'image/*,*/*;q=0.8' },
      });
      if (!response.ok) {
        console.log(`[RemoteImage] http ${response.status} url=${safeUrl}`);
        return null;
      }

      const contentLength = Number(response.headers.get('content-length') || '');
      if (Number.isFinite(contentLength) && contentLength > ITEM_PHOTO_MAX_BYTES) {
        console.log(`[RemoteImage] content-length too large url=${safeUrl}`);
        return null;
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      if (buffer.byteLength === 0 || buffer.byteLength > ITEM_PHOTO_MAX_BYTES) {
        console.log(`[RemoteImage] body size invalid url=${safeUrl} bytes=${buffer.byteLength}`);
        return null;
      }

      const mime = sniffMime(buffer, response.headers.get('content-type'));
      if (!mime) {
        console.log(`[RemoteImage] unsupported mime url=${safeUrl}`);
        return null;
      }

      // Re-check final URL after redirects (best-effort; Bun may not expose redirected URL always)
      const finalUrl = response.url ? assertSafeRemoteImageUrl(response.url) : safeUrl;
      if (!finalUrl) {
        console.log(`[RemoteImage] redirect to unsafe url=${response.url}`);
        return null;
      }

      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[RemoteImage] fetch failed url=${safeUrl} error=${message}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
