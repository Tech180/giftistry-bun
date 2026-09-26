import { describe, expect, test } from 'bun:test';
import {
  extractAmazonDomPageContextLines,
  isAmazonProductHost,
} from '@/modules/item/infrastructure/scraping/extractors/utils/amazon-dom-page-context.util';
import { buildJsonLdPageContext } from '@/modules/item/infrastructure/scraping/extractors/utils/json-ld-product.util';
import { isEmptyAiPopulateResult } from '@/modules/item/domain/utils/merge-extracted-metadata.util';

const AMAZON_HTML = `
<!DOCTYPE html>
<html>
  <head><title>Amazon.com: Fosi Audio C3 Gaming DAC : Electronics</title>
  <meta name="description" content="Amazon.com: Fosi Audio C3 Gaming DAC : Electronics" />
  </head>
  <body>
    <span id="productTitle">Fosi Audio C3 Gaming DAC Amp for PC</span>
    <a id="bylineInfo">Visit the Fosi Audio Store</a>
    <span class="a-price"><span class="a-offscreen">$129.99</span></span>
    <div id="feature-bullets">
      <ul>
        <li><span class="a-list-item">About this item</span></li>
        <li><span class="a-list-item">StepSense Footstep Radar for competitive FPS audio.</span></li>
        <li><span class="a-list-item">HiFi USB DAC with CS43131 and 7.1 surround sound.</span></li>
      </ul>
    </div>
    <div id="productDescription">Compact aluminum USB DAC amp for PC and consoles.</div>
  </body>
</html>
`.padEnd(600, ' ');

describe('amazon DOM page context', () => {
  test('detects amazon hosts', () => {
    expect(isAmazonProductHost('www.amazon.com')).toBe(true);
    expect(isAmazonProductHost('amazon.co.uk')).toBe(true);
    expect(isAmazonProductHost('shop.example')).toBe(false);
  });

  test('extracts brand, price, and feature bullets', () => {
    const lines = extractAmazonDomPageContextLines(
      AMAZON_HTML,
      'https://www.amazon.com/dp/B0GX9QTR2P/'
    );

    expect(lines).toContain('Product Name: Fosi Audio C3 Gaming DAC Amp for PC');
    expect(lines).toContain('Brand: Fosi Audio');
    expect(lines).toContain('Price: $129.99');
    expect(lines.some((line) => line.includes('StepSense Footstep Radar'))).toBe(true);
    expect(lines.some((line) => line.includes('Product Description:'))).toBe(true);
  });

  test('buildJsonLdPageContext includes amazon DOM lines without JSON-LD', () => {
    const context = buildJsonLdPageContext(
      AMAZON_HTML,
      'https://www.amazon.com/dp/B0GX9QTR2P/'
    );

    expect(context).toContain('Brand: Fosi Audio');
    expect(context).toContain('Feature: StepSense Footstep Radar');
    expect(context).toContain('Price: $129.99');
  });
});

describe('isEmptyAiPopulateResult', () => {
  test('detects blank populate payloads', () => {
    expect(
      isEmptyAiPopulateResult({
        title: '',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
        predefinedFields: {},
        userDefinedFields: {},
      })
    ).toBe(true);
  });

  test('accepts a short AI title as non-empty', () => {
    expect(
      isEmptyAiPopulateResult({
        title: 'C3 Gaming DAC Amp',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      })
    ).toBe(false);
  });
});
