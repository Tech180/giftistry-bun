import * as cheerio from 'cheerio';
import type { RetailerExtractor } from './interfaces/retailer-extractor.interface';
import { parseScrapePrice } from '../extractors/utils/parse-scrape-price.util';

export const amazonExtractor: RetailerExtractor = {
  hostnames: ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'a.co', 'amzn.to', 'amzn.com'],
  priority: 60,
  extract({ html, mode }) {
    const $ = cheerio.load(html);
    const title = $('#productTitle').first().text().trim() || null;
    const priceText =
      $('.a-price .a-offscreen').first().text().trim() ||
      $('#priceblock_ourprice').first().text().trim() ||
      $('#priceblock_dealprice').first().text().trim() ||
      '';
    const price = priceText ? parseScrapePrice(priceText) : null;
    const imageUrl = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src') || null;
    const description = $('#productDescription').first().text().trim() || null;

    if (mode === 'minimal') {
      return { title, price, imageUrl };
    }
    return { title, price, description: description || null, imageUrl };
  },
};
