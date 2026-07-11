import * as cheerio from 'cheerio';
import type { RetailerExtractor } from './retailer-registry';

function parsePrice(text: string): number | null {
  const parsed = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export const amazonExtractor: RetailerExtractor = {
  hostnames: ['amazon.com', 'amazon.ca', 'amazon.co.uk'],
  priority: 60,
  extract({ html, mode }) {
    const $ = cheerio.load(html);
    const title = $('#productTitle').first().text().trim() || null;
    const priceText =
      $('.a-price .a-offscreen').first().text().trim() ||
      $('#priceblock_ourprice').first().text().trim() ||
      $('#priceblock_dealprice').first().text().trim() ||
      '';
    const price = priceText ? parsePrice(priceText) : null;
    const imageUrl = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src') || null;
    const description = $('#productDescription').first().text().trim() || null;

    if (mode === 'minimal') {
      return { title, price, imageUrl };
    }
    return { title, price, description: description || null, imageUrl };
  },
};
