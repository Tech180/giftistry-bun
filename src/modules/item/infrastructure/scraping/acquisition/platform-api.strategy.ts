import { safeFetch, UnsafeUrlError } from '../utils/safe-fetch.util';
import { buildFetchHeaders } from '../utils/browser-headers.util';
import { scrapingConfig } from '../utils/scraping-config.util';
import { classifyHttpFetchOutcome } from '../../../domain/utils/classify-http-fetch-outcome.util';
import type { FetchOutcome } from '../../../domain/types/fetch-outcome.type';
import type { AcquisitionStrategy } from './interfaces/acquisition-strategy.interface';
import type { AcquisitionLadderContext } from './interfaces/acquisition-ladder-context.interface';
import {
  isShopifyProductPageUrl,
  resolveShopifyProductJsUrl,
} from './utils/shopify-product-js-url.util';
import { resolveHttpFetchTimeoutMs } from './utils/resolve-acquisition-timeout-ms.util';
import { wrapShopifyProductJson } from './utils/wrap-shopify-product-json.util';
import { normalizeShopifyProductJsPrices } from './utils/normalize-shopify-product-js-prices.util';

export class PlatformApiStrategy implements AcquisitionStrategy {
  readonly name = 'platform-api';

  canHandle(url: string): boolean {
    return isShopifyProductPageUrl(url);
  }

  async fetch(url: string, context: AcquisitionLadderContext = {}): Promise<FetchOutcome> {
    const apiUrl = resolveShopifyProductJsUrl(url);
    if (!apiUrl) {
      return {
        kind: 'escalate',
        outcome: 'error',
        strategy: this.name,
        message: 'could not resolve Shopify product API URL',
      };
    }

    const timeoutMs = resolveHttpFetchTimeoutMs(context.deadlineAt);
    try {
      const result = await safeFetch(apiUrl, {
        timeoutMs,
        headers: {
          ...buildFetchHeaders(url),
          Accept: 'application/json,text/javascript,*/*;q=0.8',
        },
        maxBytes: scrapingConfig.maxHtmlBytes,
        enforceHtmlContentType: false,
        contentTypeAllowlist: ['application/json', 'text/javascript', 'text/plain'],
      });

      const httpOutcome = classifyHttpFetchOutcome(result.status);
      if (httpOutcome === 'not-found') {
        return {
          kind: 'terminal',
          outcome: 'not-found',
          strategy: this.name,
          status: result.status,
          finalUrl: result.finalUrl,
        };
      }
      if (httpOutcome === 'blocked' || httpOutcome === 'login-wall') {
        return {
          kind: 'escalate',
          outcome: httpOutcome,
          strategy: this.name,
          status: result.status,
          finalUrl: result.finalUrl,
        };
      }
      if (!result.body?.trim()) {
        return {
          kind: 'escalate',
          outcome: 'error',
          strategy: this.name,
          status: result.status,
          finalUrl: result.finalUrl,
          message: 'empty Shopify product JSON body',
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.body);
      } catch {
        return {
          kind: 'escalate',
          outcome: 'error',
          strategy: this.name,
          message: 'invalid Shopify product JSON',
        };
      }

      // `.js` reports prices in cents; convert once here so every consumer sees currency units.
      parsed = normalizeShopifyProductJsPrices(parsed);

      const html = wrapShopifyProductJson(JSON.stringify(parsed), url);
      return {
        kind: 'ok',
        outcome: 'ok',
        strategy: this.name,
        status: result.status,
        html,
        finalUrl: url,
        capturedJson: [parsed],
        contentType: result.contentType,
      };
    } catch (err) {
      if (err instanceof UnsafeUrlError) {
        return {
          kind: 'terminal',
          outcome: 'unsafe-url',
          strategy: this.name,
          message: err.message,
        };
      }
      const message = err instanceof Error ? err.message : String(err);
      return {
        kind: 'escalate',
        outcome: 'error',
        strategy: this.name,
        message,
      };
    }
  }
}
