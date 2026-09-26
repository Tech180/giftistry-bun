import { describe, expect, test } from 'bun:test';
import { isUnusableProductDescription, sanitizeProductDescription } from '../src/modules/item/domain/utils/product-description.util';

const OURA_MARKETING_DESCRIPTION =
  "Introducing the world's smallest smart ring: Oura Ring 5, built with even more sensing power than previous generations. 40% smaller and ultra lightweight, Oura Ring 5 fits seamlessly in with your life and your style. The updated all-titanium design is more scratch-resistant and comfortable than ever, Oura Ring 5 delivers 50+ health metrics with research-grade accuracy. With 1 week of battery life you can even forget it's on. No more compromises when it comes to tracking your health. Oura Ring 5 is FSA/HSA Eligible: we can accept FSA or HSA funds for the following: Oura Ring, additional chargers, and shipping. IMPORTANT: Size yourself with the Oura Ring 5 Sizing Kit before you buy.";

describe('product-description.util', () => {
  test('rejects customs and notice boilerplate', () => {
    const notice =
      'NOTICE: Final payment does not include taxes and duty fees. If you want to know how much customs will charge you, call the customs office in your country.';

    expect(isUnusableProductDescription(notice)).toBe(true);
    expect(sanitizeProductDescription(notice)).toBeNull();
  });

  test('rejects long marketplace marketing copy', () => {
    expect(isUnusableProductDescription(OURA_MARKETING_DESCRIPTION)).toBe(true);
  });

  test('rejects short copy with store fluff keywords', () => {
    expect(isUnusableProductDescription('FSA/HSA eligible at checkout')).toBe(true);
  });

  test('allows short factual product descriptions', () => {
    const description = 'Compact gaming handheld with high-performance hardware for immersive gaming on the go.';
    expect(isUnusableProductDescription(description)).toBe(false);
    expect(sanitizeProductDescription(description)).toBe(description);
  });

  test('allows brief product-focused descriptions', () => {
    expect(
      isUnusableProductDescription(
        'Smart ring that tracks sleep, activity, and health metrics. Titanium build with about one week of battery life.'
      )
    ).toBe(false);
  });
});
