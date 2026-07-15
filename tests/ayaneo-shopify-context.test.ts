import { describe, expect, test } from 'bun:test';
import {
  buildJsonLdPageContext,
} from '../src/modules/item/infrastructure/scraping/extractors/json-ld-product.util';

const AYANEO_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta property="og:site_name" content="AYANEO" />
  <meta name="description" content="NOTICE: Final payment does not include taxes and duty fees." />
  <title>AYANEO Pocket MICRO 2</title>
  <script type="application/json">
    {
      "product": {
        "title": "AYANEO Pocket MICRO 2",
        "vendor": "AYANEO",
        "description": "<p>Compact gaming handheld with high-performance hardware for immersive gaming on the go.</p>",
        "options": ["Color", "RAM & SSD"],
        "variants": [
          { "id": 48322396193013, "title": "Midnight Black / 8G + 256G", "option1": "Midnight Black", "option2": "8G + 256G" },
          { "id": 48322396193014, "title": "Frosty White / 6G+128G", "option1": "Frosty White", "option2": "6G+128G" }
        ]
      }
    }
  </script>
</head>
<body></body>
</html>`;

describe('AYANEO Shopify page context', () => {
  test('includes vendor, options, and filters notice meta description', () => {
    const context = buildJsonLdPageContext(
      AYANEO_HTML,
      'https://shop.ayaneo.com/products/ayaneo-pocket-micro-2?variant=48322396193013'
    );

    expect(context).toContain('Store Name: AYANEO');
    expect(context).toContain('Vendor: AYANEO');
    expect(context).toContain('Color:');
    expect(context).toContain('RAM & SSD:');
    expect(context).toContain('Selected Configuration: Midnight Black / 8G + 256G');
    expect(context).not.toContain('NOTICE: Final payment');
    expect(context).toContain('Compact gaming handheld');
  });
});
