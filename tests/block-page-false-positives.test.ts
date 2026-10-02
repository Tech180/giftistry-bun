import { describe, expect, test } from 'bun:test';
import { validateScrapeResult } from '../src/modules/item/infrastructure/scraping/utils/validate-scrape-result.util';
import type { ExtractedMetadata } from '../src/modules/item/domain/interfaces/extracted-metadata.interface';

const strongProduct: ExtractedMetadata = {
  title: 'Cool Mug',
  price: 12.99,
  description: 'A ceramic mug',
  color: null,
  size: null,
  category: null,
  imageUrl: 'https://cdn.example/mug.jpg',
};

function pad(html: string): string {
  return html.padEnd(600, ' ');
}

describe('validateScrapeResult false-positive fixtures', () => {
  test('Shopify cart drawer "Continue shopping" does not block', () => {
    const html = pad(`
      <html><head><title>Cool Mug – Example Shop</title></head>
      <body>
        <h1>Cool Mug</h1>
        <div class="cart-drawer">Continue shopping</div>
        <span class="price">$12.99</span>
        <img src="https://cdn.example/mug.jpg" />
      </body></html>
    `);
    const validation = validateScrapeResult(strongProduct, html, 'full', {
      url: 'https://shop.example/products/cool-mug',
    });
    expect(validation.valid).toBe(true);
    expect(validation.blocked).toBeFalsy();
  });

  test('reCAPTCHA footer does not block a product page', () => {
    const html = pad(`
      <html><head><title>Cool Mug</title></head>
      <body>
        <h1>Cool Mug</h1>
        <p>$12.99</p>
        <img src="https://cdn.example/mug.jpg" />
        <footer>This site is protected by reCAPTCHA and the Google Privacy Policy.</footer>
      </body></html>
    `);
    const validation = validateScrapeResult(strongProduct, html, 'full', {
      url: 'https://shop.example/products/cool-mug',
    });
    expect(validation.valid).toBe(true);
  });

  test('review containing "Access denied" does not block', () => {
    const html = pad(`
      <html><head><title>Cool Mug</title></head>
      <body>
        <h1>Cool Mug</h1>
        <p>$12.99</p>
        <img src="https://cdn.example/mug.jpg" />
        <div class="review">Access denied to the VIP lounge, still love this mug.</div>
      </body></html>
    `);
    const validation = validateScrapeResult(strongProduct, html, 'full', {
      url: 'https://shop.example/products/cool-mug',
    });
    expect(validation.valid).toBe(true);
  });
});
