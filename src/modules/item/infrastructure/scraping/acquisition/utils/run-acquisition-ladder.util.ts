import type { FetchOutcome } from '../../../../domain/types/fetch-outcome.type';
import type { AcquisitionStrategy } from '../interfaces/acquisition-strategy.interface';
import type { RunAcquisitionLadderOptions } from '../interfaces/run-acquisition-ladder-options.interface';
import { HttpFetchStrategy } from '../http-fetch.strategy';
import { PlaywrightStrategy } from '../playwright.strategy';
import { PlatformApiStrategy } from '../platform-api.strategy';
import type { HttpFetchFn } from '../types/http-fetch-fn.type';
import type { PlaywrightFetchFn } from '../types/playwright-fetch-fn.type';
import { SCRAPE_MIN_TIER_BUDGET_MS } from '../../constants/scrape-budget.constant';
import { isBudgetExhausted } from '../../utils/scrape-deadline.util';

export function createDefaultAcquisitionStrategies(
  deps: {
    fetchHtml?: HttpFetchFn;
    browserFetch?: PlaywrightFetchFn;
  } = {}
): AcquisitionStrategy[] {
  return [
    new PlatformApiStrategy(),
    new HttpFetchStrategy(deps.fetchHtml),
    new PlaywrightStrategy(deps.browserFetch),
  ];
}

export async function runAcquisitionLadder(
  url: string,
  options: RunAcquisitionLadderOptions = {}
): Promise<FetchOutcome> {
  const strategies =
    options.strategies ??
    createDefaultAcquisitionStrategies({
      fetchHtml: undefined,
      browserFetch: undefined,
    });
  const context = options.context ?? {};
  const allowed = options.onlyStrategyNames ? new Set(options.onlyStrategyNames) : null;

  let last: FetchOutcome | undefined;

  for (const strategy of strategies) {
    if (allowed && !allowed.has(strategy.name)) continue;
    if (!strategy.canHandle(url, context)) continue;

    if (isBudgetExhausted(context.deadlineAt, SCRAPE_MIN_TIER_BUDGET_MS)) {
      last ??= {
        kind: 'escalate',
        outcome: 'timeout',
        strategy: strategy.name,
        message: 'scrape-budget-exhausted',
      };
      break;
    }

    const outcome = await strategy.fetch(url, context);
    last = outcome;

    if (outcome.kind === 'ok' || outcome.kind === 'terminal') {
      return outcome;
    }
  }

  return (
    last ?? {
      kind: 'escalate',
      outcome: 'error',
      strategy: 'acquisition-ladder',
      message: 'No acquisition strategy handled the URL',
    }
  );
}
