/** Minimal Playwright page surface needed to dismiss the Amazon gate. */
export interface AmazonContinueShoppingPage {
  url: () => string;
  content: () => Promise<string>;
  locator: (selector: string) => {
    first: () => {
      isVisible: (opts?: { timeout?: number }) => Promise<boolean>;
      click: (opts?: { timeout?: number }) => Promise<void>;
    };
  };
  waitForSelector: (
    selector: string,
    opts?: { timeout?: number }
  ) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
}
