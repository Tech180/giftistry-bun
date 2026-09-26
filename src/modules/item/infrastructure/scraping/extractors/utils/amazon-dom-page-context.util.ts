import * as cheerio from 'cheerio';
import { AMAZON_HOST_SUFFIXES } from '../constants/amazon-host-suffixes.constant';

export function isAmazonProductHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return AMAZON_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

function normalizeBrand(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  const visitStore = trimmed.match(/^visit the (.+?) store$/i);
  if (visitStore?.[1]) return visitStore[1].trim();
  const brandPrefix = trimmed.match(/^brand:\s*(.+)$/i);
  if (brandPrefix?.[1]) return brandPrefix[1].trim();
  return trimmed;
}

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

  const productTitle = $('#productTitle').first().text().replace(/\s+/g, ' ').trim();
  if (productTitle) lines.push(`Product Name: ${productTitle}`);

  const brand = normalizeBrand(
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
