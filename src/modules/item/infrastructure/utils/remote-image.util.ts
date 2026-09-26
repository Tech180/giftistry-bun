import { IMAGE_DATA_URL_ALLOWED_TYPES } from '@/common/utils/constants/image-data-url.constant';
import { IMAGE_MIME_BY_MAGIC } from '../constants/remote-image-fetch.constant';

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
    if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255) || parts.length < 2) {
      return true;
    }
    const a = parts[0];
    const b = parts[1];
    if (a === undefined || b === undefined) {
      return true;
    }
    if (a === 10) {
      return true;
    }
    if (a === 127) {
      return true;
    }
    if (a === 0) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 100 && b >= 64 && b <= 127) {
      return true; // CGNAT
    }
    return false;
  }

  // IPv6 / IPv4-mapped rough checks
  if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  if (host.includes('127.0.0.1')) return true;

  return false;
}

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

export function sniffImageMime(
  bytes: Uint8Array,
  contentType: string | null
): string | null {
  for (const entry of IMAGE_MIME_BY_MAGIC) {
    if (entry.bytes.every((b, i) => bytes[i] === b)) {
      if (entry.mime === 'image/webp') {
        // RIFF....WEBP
        if (bytes.length < 12) {
          continue;
        }
        const tag = String.fromCharCode(...bytes.subarray(8, 12));
        if (tag !== 'WEBP') {
          continue;
        }
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
