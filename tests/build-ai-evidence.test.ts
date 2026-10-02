import { describe, expect, test } from 'bun:test';
import { buildAiEvidence } from '../src/modules/item/domain/utils/build-ai-evidence.util';

const html = `<!doctype html>
<html>
<head>
  <title>Acme Widget Pro</title>
  <meta property="og:image" content="https://cdn.example/widget.jpg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Acme Widget Pro",
    "brand": { "@type": "Brand", "name": "Acme" },
    "offers": { "@type": "Offer", "price": "19.99", "priceCurrency": "USD" }
  }
  </script>
</head>
<body>
  <main><p>Compact widget for daily use. Price: $19.99</p></main>
</body>
</html>`;

describe('buildAiEvidence', () => {
  test('emits delimited evidence sections', () => {
    const evidence = buildAiEvidence({
      html,
      url: 'https://shop.example/widget',
      extraction: { pageContextMaxChars: 0 },
    });

    expect(evidence).toContain('=== STRUCTURED CANDIDATES ===');
    expect(evidence).toContain('Acme Widget Pro');
    expect(evidence).toContain('=== VISIBLE PRICE SNIPPETS ===');
    expect(evidence).toContain('=== MAIN CONTENT (trimmed) ===');
    expect(evidence).toContain('=== IMAGE CANDIDATES ===');
    expect(evidence).toContain('https://cdn.example/widget.jpg');
  });

  test('includes scraped facts section when scrape metadata provided', () => {
    const evidence = buildAiEvidence({
      html,
      url: 'https://shop.example/widget',
      scrape: {
        title: 'Acme Widget Pro',
        price: 19.99,
        description: null,
        color: 'Blue',
        size: null,
        category: 'tech',
        imageUrl: 'https://cdn.example/widget.jpg',
      },
      extraction: { pageContextMaxChars: 0 },
    });

    expect(evidence).toContain('=== SCRAPED FACTS ===');
    expect(evidence).toContain('"color":"Blue"');
  });
});
