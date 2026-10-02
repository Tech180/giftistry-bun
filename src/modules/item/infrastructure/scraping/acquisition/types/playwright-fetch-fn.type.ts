import type { PlaywrightFetchResult } from '../../interfaces/playwright-fetch-result.interface';
import type { PlaywrightFetchPageOptions } from '../../interfaces/playwright-fetch-page-options.interface';

export type PlaywrightFetchFn = (
  url: string,
  timeoutMs?: number,
  options?: PlaywrightFetchPageOptions
) => Promise<PlaywrightFetchResult>;
