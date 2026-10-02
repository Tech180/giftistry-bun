import type { DetectedPlatform } from '../types/detected-platform.type';
import {
  PLATFORM_ASSET_HOST_PATTERNS,
  PLATFORM_GENERATOR_PATTERNS,
} from '../constants/platform-detection-patterns.constant';

function readMetaGenerator(html: string): string {
  const match =
    html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i);
  return match?.[1]?.trim() ?? '';
}

function collectAssetHosts(html: string): string {
  const hosts: string[] = [];
  const srcRe = /\b(?:src|href)=["'](https?:\/\/[^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = srcRe.exec(html)) && hosts.length < 40) {
    try {
      hosts.push(new URL(m[1]!).hostname);
    } catch {
      // ignore
    }
  }
  return hosts.join(' ');
}

export function detectPlatform(html: string, url?: string): DetectedPlatform {
  if (url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (host.includes('amazon.') || host === 'a.co' || host.includes('amzn.')) {
        return 'amazon';
      }
    } catch {
      // ignore
    }
  }

  const generator = readMetaGenerator(html);
  for (const row of PLATFORM_GENERATOR_PATTERNS) {
    if (row.pattern.test(generator)) {
      return row.platform;
    }
  }

  const assets = collectAssetHosts(html);
  for (const row of PLATFORM_ASSET_HOST_PATTERNS) {
    if (row.pattern.test(assets)) {
      return row.platform;
    }
  }

  if (/shopify\.theme|Shopify\.shop/i.test(html)) {
    return 'shopify';
  }

  return 'unknown';
}
