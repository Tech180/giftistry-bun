import type { PlaywrightFetchPageOptions } from '../../interfaces/playwright-fetch-page-options.interface';

export interface AcquisitionLadderContext {
  /** Absolute epoch-ms deadline shared by every tier of one scrape. */
  deadlineAt?: number;
  refreshCache?: boolean;
  playwrightOptions?: PlaywrightFetchPageOptions;
}
