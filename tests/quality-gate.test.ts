import { describe, expect, test } from 'bun:test';
import { runQualityGate } from '../src/modules/item/infrastructure/scraping/utils/quality-gate.util';

const PRODUCT_HTML = `<!DOCTYPE html><html><head>
<title>Blue Widget</title>
<meta property="og:type" content="product" />
<script type="application/ld+json">{"@type":"Product","name":"Blue Widget"}</script>
</head><body><button>Add to cart</button><p>Blue Widget description</p></body></html>`.padEnd(
  600,
  ' '
);

describe('runQualityGate', () => {
  test('accepts strong product metadata', () => {
    const gate = runQualityGate({
      metadata: {
        title: 'Blue Widget',
        price: 19.99,
        description: 'A widget',
        color: null,
        size: null,
        category: null,
        imageUrl: 'https://cdn.example/w.jpg',
      },
      html: PRODUCT_HTML,
      confidence: 'high',
      validationValid: true,
    });
    expect(gate.outcome).toBe('accept');
    expect(gate.reason).toBe('strong-product-page');
  });

  test('ai-assist when validation invalid with partial slug title', () => {
    const gate = runQualityGate({
      metadata: {
        title: 'Slug Title',
        price: null,
        description: null,
        color: null,
        size: null,
        category: null,
        imageUrl: null,
      },
      html: PRODUCT_HTML,
      confidence: 'low',
      validationValid: false,
      validationReason: 'slug-title-only',
      titleFromSlug: true,
    });
    expect(gate.outcome).toBe('ai-assist');
    expect(gate.reason).toBe('slug-title-only');
  });
});
