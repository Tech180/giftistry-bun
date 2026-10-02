import { classifyHttpFetchOutcome } from '../../../domain/utils/classify-http-fetch-outcome.util';
import type { FetchOutcome } from '../../../domain/types/fetch-outcome.type';
import { resolveScrapeFinalUrl } from '../../../domain/utils/scrape-url-safety.util';
import { ScrapeFetchError } from '../errors/scrape-fetch-error';
import { fetchPageHtml } from '../utils/fetch-page-html.util';
import type { AcquisitionStrategy } from './interfaces/acquisition-strategy.interface';
import type { AcquisitionLadderContext } from './interfaces/acquisition-ladder-context.interface';
import type { HttpFetchFn } from './types/http-fetch-fn.type';
import { resolveHttpFetchTimeoutMs } from './utils/resolve-acquisition-timeout-ms.util';

export class HttpFetchStrategy implements AcquisitionStrategy {
  readonly name = 'http-fetch';

  constructor(private readonly fetchHtml: HttpFetchFn = fetchPageHtml) {}

  canHandle(): boolean {
    return true;
  }

  async fetch(url: string, context: AcquisitionLadderContext = {}): Promise<FetchOutcome> {
    const timeoutMs = resolveHttpFetchTimeoutMs(context.deadlineAt);
    try {
      const { html, finalUrl: rawFinal, status } = await this.fetchHtml(url, timeoutMs);
      const finalUrl = resolveScrapeFinalUrl(rawFinal, url);
      if (!finalUrl) {
        return {
          kind: 'terminal',
          outcome: 'unsafe-url',
          strategy: this.name,
          message: 'unsafe final URL after redirect',
        };
      }

      const httpOutcome = status != null ? classifyHttpFetchOutcome(status) : null;
      if (httpOutcome === 'not-found') {
        return {
          kind: 'terminal',
          outcome: 'not-found',
          strategy: this.name,
          status,
          finalUrl,
        };
      }
      if (httpOutcome === 'login-wall') {
        return {
          kind: 'escalate',
          outcome: 'login-wall',
          strategy: this.name,
          status,
          finalUrl,
          html,
        };
      }
      if (httpOutcome === 'blocked') {
        return {
          kind: 'escalate',
          outcome: 'blocked',
          strategy: this.name,
          status,
          finalUrl,
          html,
        };
      }
      if (status != null && (status < 200 || status >= 300)) {
        return {
          kind: 'escalate',
          outcome: 'error',
          strategy: this.name,
          status,
          finalUrl,
          html,
          message: `http-${status}`,
        };
      }

      if (!html?.trim()) {
        return {
          kind: 'terminal',
          outcome: 'empty',
          strategy: this.name,
          status,
          finalUrl,
        };
      }

      return {
        kind: 'ok',
        outcome: 'ok',
        strategy: this.name,
        status: status ?? 200,
        html,
        finalUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof ScrapeFetchError && err.status === 0) {
        return {
          kind: 'terminal',
          outcome: 'unsafe-url',
          strategy: this.name,
          message,
        };
      }
      const blocked =
        /HTTP\s*403|HTTP\s*429|HTTP\s*401|HTTP\s*503/i.test(message) ||
        (err instanceof ScrapeFetchError &&
          (err.status === 401 ||
            err.status === 403 ||
            err.status === 429 ||
            err.status === 503));
      return {
        kind: 'escalate',
        outcome: blocked ? 'blocked' : 'error',
        strategy: this.name,
        status: err instanceof ScrapeFetchError ? err.status : undefined,
        message,
      };
    }
  }
}
