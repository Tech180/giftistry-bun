import type { BrowserContext } from 'playwright';

export interface PlaywrightContextLease {
  context: BrowserContext;
  release: () => Promise<void>;
}
