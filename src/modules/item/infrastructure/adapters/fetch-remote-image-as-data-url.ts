import { ITEM_PHOTO_MAX_BYTES } from '@/common/utils/constants/image-data-url.constant';
import type { RemoteImageFetcher } from '../../domain/ports/remote-image-fetcher.port';
import { REMOTE_IMAGE_FETCH_TIMEOUT_MS } from '../constants/remote-image-fetch.constant';
import {
  assertSafeRemoteImageUrl,
  sniffImageMime,
} from '../utils/remote-image.util';
import { safeFetchBytes, UnsafeUrlError } from '../scraping/utils/safe-fetch.util';

export class FetchRemoteImageAsDataUrl implements RemoteImageFetcher {
  async fetchAsDataUrl(url: string): Promise<string | null> {
    const safeUrl = assertSafeRemoteImageUrl(url);
    if (!safeUrl) {
      console.log(`[RemoteImage] rejected url=${url}`);
      return null;
    }

    try {
      const result = await safeFetchBytes(safeUrl.toString(), {
        timeoutMs: REMOTE_IMAGE_FETCH_TIMEOUT_MS,
        maxBytes: ITEM_PHOTO_MAX_BYTES,
        headers: { Accept: 'image/*,*/*;q=0.8' },
        enforceHtmlContentType: false,
        allowedPorts: new Set([443]),
      });

      if (result.status < 200 || result.status >= 300) {
        console.log(`[RemoteImage] http ${result.status} url=${safeUrl}`);
        return null;
      }

      const buffer = result.bytes;
      if (!buffer || buffer.byteLength === 0 || buffer.byteLength > ITEM_PHOTO_MAX_BYTES) {
        console.log(`[RemoteImage] body size invalid url=${safeUrl} bytes=${buffer?.byteLength ?? 0}`);
        return null;
      }

      const mime = sniffImageMime(buffer, result.contentType);
      if (!mime) {
        console.log(`[RemoteImage] unsupported mime url=${safeUrl}`);
        return null;
      }

      const finalUrl = result.finalUrl ? assertSafeRemoteImageUrl(result.finalUrl) : safeUrl;
      if (!finalUrl) {
        console.log(`[RemoteImage] redirect to unsafe url=${result.finalUrl}`);
        return null;
      }

      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch (err) {
      const message =
        err instanceof UnsafeUrlError
          ? err.message
          : err instanceof Error
            ? err.message
            : String(err);
      console.log(`[RemoteImage] fetch failed url=${safeUrl} error=${message}`);
      return null;
    }
  }
}
