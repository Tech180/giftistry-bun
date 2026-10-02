export function wrapShopifyProductJson(productJson: string, _pageUrl: string): string {
  return `<!DOCTYPE html><html><head><title>Shopify product</title></head><body><script type="application/json">${productJson}</script></body></html>`;
}
