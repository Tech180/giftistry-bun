import { describe, expect, test } from 'bun:test';
import { classifyPageType } from '../src/modules/item/domain/utils/classify-page-type.util';

const PRODUCT_HTML = `<!DOCTYPE html><html><head>
<title>Blue Widget</title>
<meta property="og:type" content="product" />
<script type="application/ld+json">{"@type":"Product","name":"Blue Widget"}</script>
</head><body><button>Add to cart</button></body></html>`;

describe('classifyPageType', () => {
  test('detects product pages', () => {
    expect(classifyPageType(PRODUCT_HTML)).toBe('product');
  });

  test('detects cart pages', () => {
    const html = `<html><head><title>Your Cart</title></head><body>Shopping cart items</body></html>`;
    expect(classifyPageType(html)).toBe('cart');
  });

  test('detects error pages from status', () => {
    expect(classifyPageType('<html><body>ok</body></html>', { httpStatus: 404 })).toBe('error');
  });
});
