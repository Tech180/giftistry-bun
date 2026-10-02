import { IMAGE_DATA_URL_ALLOWED_TYPES } from '@/common/utils/constants/image-data-url.constant';
import { IMAGE_MIME_BY_MAGIC } from '../constants/remote-image-fetch.constant';
import { isPrivateNetworkAddress } from '../../domain/utils/is-private-network-address.util';

export function assertSafeRemoteImageUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') {
    return null;
  }
  if (parsed.username || parsed.password) {
    return null;
  }
  if (!parsed.hostname) {
    return null;
  }
  if (isPrivateNetworkAddress(parsed.hostname)) {
    return null;
  }
  return parsed;
}

export function sniffImageMime(
  bytes: Uint8Array,
  contentType: string | null
): string | null {
  for (const entry of IMAGE_MIME_BY_MAGIC) {
    if (entry.bytes.every((b, i) => bytes[i] === b)) {
      if (entry.mime === 'image/webp') {
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
