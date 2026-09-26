import { ITEM_PHOTO_MAX_BYTES } from '@/common/utils/constants/image-data-url.constant';
import type { RemoteImageFetcher } from '../../domain/ports/remote-image-fetcher.port';
import { REMOTE_IMAGE_FETCH_TIMEOUT_MS } from '../constants/remote-image-fetch.constant';
import {
  assertSafeRemoteImageUrl,
  sniffImageMime,
} from '../utils/remote-image.util';

export class FetchRemoteImageAsDataUrl implements RemoteImageFetcher {
  async fetchAsDataUrl(url: string): Promise<string | null> {
    const safeUrl = assertSafeRemoteImageUrl(url);
    if (!safeUrl) {
      console.log(`[RemoteImage] rejected url=${url}`);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REMOTE_IMAGE_FETCH_TIMEOUT_MS);
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

      const mime = sniffImageMime(buffer, response.headers.get('content-type'));
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
