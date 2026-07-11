import { extractFromCapturedJson } from '../extractors/embedded-json.extractor';
import type { RetailerExtractor } from './retailer-registry';

export const targetExtractor: RetailerExtractor = {
  hostnames: ['target.com'],
  priority: 60,
  extract({ html, mode, capturedJson = [] }) {
    const fromJson = extractFromCapturedJson(capturedJson, mode);

    const titleMatch = html.match(/"title"\s*:\s*"([^"]+)"/);
    const priceMatch = html.match(/"current_retail(?:_min)?"\s*:\s*([0-9.]+)/);

    return {
      title: fromJson.title || (titleMatch?.[1] ?? null),
      price: fromJson.price ?? (priceMatch ? Number(priceMatch[1]) : null),
      description: fromJson.description ?? null,
      imageUrl: fromJson.imageUrl ?? null,
      color: fromJson.color ?? null,
      size: fromJson.size ?? null,
    };
  },
};
