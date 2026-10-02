import { resolveScrapeFinalUrl } from '../../../domain/utils/scrape-url-safety.util';
import type { FetchOutcome } from '../../../domain/types/fetch-outcome.type';
import { playwrightFetchPage } from '../utils/playwright-fetch-page.util';
import type { AcquisitionStrategy } from './interfaces/acquisition-strategy.interface';
import type { AcquisitionLadderContext } from './interfaces/acquisition-ladder-context.interface';
import type { PlaywrightFetchFn } from './types/playwright-fetch-fn.type';
import { resolvePlaywrightFetchTimeoutMs } from './utils/resolve-acquisition-timeout-ms.util';

export class PlaywrightStrategy implements AcquisitionStrategy {
  readonly name = 'playwright';

  constructor(private readonly browserFetch: PlaywrightFetchFn = playwrightFetchPage) {}

  canHandle(): boolean {
    return true;
  }

  async fetch(url: string, context: AcquisitionLadderContext = {}): Promise<FetchOutcome> {
    const timeoutMs = resolvePlaywrightFetchTimeoutMs(context.deadlineAt);
    try {
      const { html, capturedJson, finalUrl: rawFinal, status } = await this.browserFetch(
        url,
        timeoutMs,
        context.deadlineAt != null
          ? { ...context.playwrightOptions, deadlineAt: context.deadlineAt }
          : context.playwrightOptions
      );
      const finalUrl = resolveScrapeFinalUrl(rawFinal, url);
      if (!finalUrl) {
        return {
          kind: 'terminal',
          outcome: 'unsafe-url',
          strategy: this.name,
          message: 'unsafe final URL after redirect',
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
        capturedJson,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const timeout = /timeout|timed out/i.test(message);
      return {
        kind: 'escalate',
        outcome: timeout ? 'timeout' : 'error',
        strategy: this.name,
        message,
      };
    }
  }
}
