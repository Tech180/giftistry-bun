/** Amazon PDP DOM scopes (#productTitle, buy-box price, #landingImage). */
import * as cheerio from 'cheerio';
import type { RetailerExtractor } from './interfaces/retailer-extractor.interface';
import { parseScrapePrice } from '../extractors/utils/parse-scrape-price.util';
import { resolveAmazonScrapeTitle } from '../extractors/utils/resolve-amazon-scrape-title.util';
import {
  AMAZON_BUY_BOX_SELECTORS,
  AMAZON_PRICE_EXCLUDE_CONTAINERS,
} from '../constants/amazon-buy-box-selectors.constant';

export const amazonExtractor: RetailerExtractor = {
  hostnames: ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'a.co', 'amzn.to', 'amzn.com'],
  priority: 60,
  extract({ html, mode }) {
    const $ = cheerio.load(html);
    const title = resolveAmazonScrapeTitle($);

    let priceText = '';
    for (const selector of AMAZON_BUY_BOX_SELECTORS) {
      const text = $(selector).first().text().trim();
      if (text) {
        priceText = text;
        break;
      }
    }
    if (!priceText) {
      // Fallback: first .a-price outside sims/carousels
      $(AMAZON_PRICE_EXCLUDE_CONTAINERS).remove();
      priceText = $('.a-price .a-offscreen').first().text().trim() || '';
    }

    const price = priceText ? parseScrapePrice(priceText) : null;
    const imageUrl = $('#landingImage').attr('src') || $('#imgBlkFront').attr('src') || null;
    const description = $('#productDescription').first().text().trim() || null;

    if (mode === 'minimal') {
      return { title, price, imageUrl };
    }
    return { title, price, description: description || null, imageUrl };
  },
};
