import { describe, expect, test } from 'bun:test';
import {
  buildAmazonProductUrl,
  canonicalizeAmazonProductUrl,
  isAmazonProductPageUrl,
  isAmazonScrapeUrl,
  parseAmazonAsinFromHtml,
  parseAmazonAsinFromUrl,
  resolveAmazonProductTargetUrl,
  resolveScrapeRedirectUrl,
} from '../src/modules/item/infrastructure/scraping/utils/amazon-scrape-url.util';

describe('amazon-scrape-url', () => {
  test('isAmazonScrapeUrl detects product and short-link hosts', () => {
    expect(isAmazonScrapeUrl('https://www.amazon.com/dp/B0TEST1234')).toBe(true);
    expect(isAmazonScrapeUrl('https://a.co/d/09RD8uDq')).toBe(true);
    expect(isAmazonScrapeUrl('https://amzn.to/abc')).toBe(true);
    expect(isAmazonScrapeUrl('https://shop.example/p/1')).toBe(false);
  });

  test('parseAmazonAsinFromUrl reads dp and gp paths', () => {
    expect(parseAmazonAsinFromUrl('https://www.amazon.com/dp/B0GX9QTR2P')).toBe('B0GX9QTR2P');
    expect(parseAmazonAsinFromUrl('https://www.amazon.com/gp/product/B0GX9QTR2P/ref=x')).toBe(
      'B0GX9QTR2P'
    );
    expect(parseAmazonAsinFromUrl('https://www.amazon.co.uk/gp/aw/d/B00TESTASI')).toBe('B00TESTASI');
    expect(parseAmazonAsinFromUrl('https://a.co/d/09RD8uDq')).toBeNull();
  });

  test('isAmazonProductPageUrl requires a product path with ASIN', () => {
    expect(isAmazonProductPageUrl('https://www.amazon.com/dp/B0GX9QTR2P')).toBe(true);
    expect(
      isAmazonProductPageUrl(
        'https://www.amazon.com/fmc/everyday-essentials-category?node=16310101&ref_=eemb_redirect_grocery'
      )
    ).toBe(false);
  });

  test('parseAmazonAsinFromHtml recovers ASIN from attributes and links', () => {
    expect(parseAmazonAsinFromHtml('<div data-asin="B0GX9QTR2P"></div>')).toBe('B0GX9QTR2P');
    expect(
      parseAmazonAsinFromHtml('<a href="https://www.amazon.com/dp/B0GX9QTR2P/ref=x">product</a>')
    ).toBe('B0GX9QTR2P');
    expect(parseAmazonAsinFromHtml('<html><body>no asin here</body></html>')).toBeNull();
  });

  test('resolveAmazonProductTargetUrl accepts products and rejects decoys', () => {
    expect(resolveAmazonProductTargetUrl('https://www.amazon.com/dp/B0GX9QTR2P/ref=sr_1')).toBe(
      'https://www.amazon.com/dp/B0GX9QTR2P'
    );
    expect(
      resolveAmazonProductTargetUrl(
        'https://www.amazon.com/fmc/everyday-essentials-category?node=16310101&ref_=eemb_redirect_grocery'
      )
    ).toBeNull();
    expect(
      resolveAmazonProductTargetUrl(
        'https://www.amazon.com/fmc/everyday-essentials-category?node=16310101',
        '<div data-asin="B0GX9QTR2P"></div>'
      )
    ).toBe('https://www.amazon.com/dp/B0GX9QTR2P');
  });

  test('buildAmazonProductUrl builds canonical dp URLs', () => {
    expect(buildAmazonProductUrl('b0gx9qtr2p')).toBe('https://www.amazon.com/dp/B0GX9QTR2P');
    expect(buildAmazonProductUrl('B0GX9QTR2P', 'www.amazon.ca')).toBe(
      'https://www.amazon.ca/dp/B0GX9QTR2P'
    );
  });

  test('canonicalizeAmazonProductUrl normalizes product URLs', () => {
    expect(
      canonicalizeAmazonProductUrl(
        'https://www.amazon.com/Some-Title/dp/B0GX9QTR2P/ref=sr_1_1?keywords=x'
      )
    ).toBe('https://www.amazon.com/dp/B0GX9QTR2P');
    expect(
      canonicalizeAmazonProductUrl(
        'https://www.amazon.com/ElecVoztile-Protection/dp/B0FRMQJGJB/?_encoding=UTF8&pd_rd_w=AzNLd&pf_rd_r=8MW1EWGRKSM6N91BXDKJ&th=1'
      )
    ).toBe('https://www.amazon.com/dp/B0FRMQJGJB');
    expect(canonicalizeAmazonProductUrl('https://a.co/d/x')).toBe('https://a.co/d/x');
  });

  test('resolveScrapeRedirectUrl applies safe final URL rules', async () => {
    const ok = await resolveScrapeRedirectUrl('https://a.co/d/x', async () => ({
      html: '<html></html>',
      finalUrl: 'https://www.amazon.com/dp/B0TEST1234',
    }));
    expect(ok.finalUrl).toBe('https://www.amazon.com/dp/B0TEST1234');

    const unsafe = await resolveScrapeRedirectUrl('https://a.co/d/x', async () => ({
      html: '<html></html>',
      finalUrl: 'http://192.168.1.1/p',
    }));
    expect(unsafe.finalUrl).toBeNull();
  });
});
