import type { Page } from 'playwright';
import {
  CONSENT_BUTTON_TEXT,
  CONSENT_SELECTORS,
} from '../constants/consent-banner.constant';

export async function dismissConsentBanners(page: Page): Promise<void> {
  for (const selector of CONSENT_SELECTORS) {
    const button = page.locator(selector).first();
    if (await button.isVisible({ timeout: 300 }).catch(() => false)) {
      await button.click({ timeout: 1_000 }).catch(() => {});
      return;
    }
  }

  const candidates = page.getByRole('button', { name: CONSENT_BUTTON_TEXT });
  const count = await candidates.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 3); i++) {
    const button = candidates.nth(i);
    if (await button.isVisible({ timeout: 200 }).catch(() => false)) {
      await button.click({ timeout: 1_000 }).catch(() => {});
      return;
    }
  }
}
