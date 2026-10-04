import { COMMENT_IMAGE_MAX_BYTES } from '@/common/utils/constants/image-data-url.constant';
import { safeFetchBytes } from '@/modules/item/infrastructure/scraping/utils/safe-fetch.util';
import { sniffImageMime } from '@/modules/item/infrastructure/utils/remote-image.util';
import type { GiphyCdnImageFetcher } from '../../domain/ports/giphy-cdn-image-fetcher.port';
import { isGiphyCdnHost } from '../../domain/utils/is-giphy-cdn-host.util';
import { GIPHY_CDN_FETCH_TIMEOUT_MS } from '../constants/giphy-api.constant';

export class GiphyCdnImageFetcherAdapter implements GiphyCdnImageFetcher {
  async fetchAsDataUrl(rawUrl: string): Promise<string | null> {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl.trim());
    } catch {
      return null;
    }

    if (parsed.protocol !== 'https:' || !isGiphyCdnHost(parsed.hostname)) {
      return null;
    }

    try {
      const result = await safeFetchBytes(parsed.toString(), {
        timeoutMs: GIPHY_CDN_FETCH_TIMEOUT_MS,
        maxBytes: COMMENT_IMAGE_MAX_BYTES,
        headers: { Accept: 'image/*,*/*;q=0.8' },
        enforceHtmlContentType: false,
        allowedPorts: new Set([443]),
      });

      if (result.status < 200 || result.status >= 300) {
        return null;
      }

      const buffer = result.bytes;
      if (!buffer?.byteLength || buffer.byteLength > COMMENT_IMAGE_MAX_BYTES) {
        return null;
      }

      const mime = sniffImageMime(buffer, result.contentType);
      if (!mime) {
        return null;
      }

      const base64 = Buffer.from(buffer).toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch {
      return null;
    }
  }
}
