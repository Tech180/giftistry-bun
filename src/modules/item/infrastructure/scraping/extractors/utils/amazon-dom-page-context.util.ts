import * as cheerio from 'cheerio';
import { isAmazonProductHost } from '../../../../domain/utils/amazon-url.util';
import { normalizeAmazonBrand } from './normalize-amazon-brand.util';
import { resolveAmazonProductTitleFromDom } from './resolve-amazon-product-title-from-dom.util';

/**
 * Amazon product pages often omit JSON-LD. Pull DOM signals the AI populate
 * step needs (brand, bullets, price) so it is not stuck with SEO title/meta only.
 */
export function extractAmazonDomPageContextLines(html: string, url: string): string[] {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    return [];
  }
  if (!isAmazonProductHost(hostname)) return [];

  const $ = cheerio.load(html);
  const lines: string[] = [];

  const productTitle = resolveAmazonProductTitleFromDom($);
  if (productTitle) lines.push(`Product Name: ${productTitle}`);

  const brand = normalizeAmazonBrand(
    $('#bylineInfo').first().text() || $('a#bylineInfo').first().text() || ''
  );
  if (brand) lines.push(`Brand: ${brand}`);

  const priceText =
    $('.a-price .a-offscreen').first().text().trim() ||
    $('#priceblock_ourprice').first().text().trim() ||
    $('#priceblock_dealprice').first().text().trim() ||
    '';
  if (priceText) lines.push(`Price: ${priceText}`);

  const bullets = $('#feature-bullets li span.a-list-item')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim())
    .get()
    .filter((text) => text.length > 0 && !/^about this item$/i.test(text))
    .slice(0, 8);

  for (const bullet of bullets) {
    lines.push(`Feature: ${bullet.slice(0, 400)}`);
  }

  const description = $('#productDescription')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
  if (description) lines.push(`Product Description: ${description}`);

  return lines;
}
