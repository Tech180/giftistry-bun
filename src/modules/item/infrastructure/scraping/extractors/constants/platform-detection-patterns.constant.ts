import type { DetectedPlatform } from '../types/detected-platform.type';

export const PLATFORM_GENERATOR_PATTERNS: Array<{
  platform: DetectedPlatform;
  pattern: RegExp;
}> = [
  { platform: 'shopify', pattern: /shopify/i },
  { platform: 'magento', pattern: /magento/i },
  { platform: 'woocommerce', pattern: /woocommerce/i },
  { platform: 'bigcommerce', pattern: /bigcommerce/i },
  { platform: 'salesforce-commerce', pattern: /demandware|salesforce commerce/i },
];

export const PLATFORM_ASSET_HOST_PATTERNS: Array<{
  platform: DetectedPlatform;
  pattern: RegExp;
}> = [
  { platform: 'shopify', pattern: /cdn\.shopify\.com/i },
  { platform: 'magento', pattern: /static\.(?:versions\.)?magento/i },
  { platform: 'bigcommerce', pattern: /bigcommerce\.com/i },
  {
    platform: 'amazon',
    pattern: /images-(?:na|eu|fe)-ssl-images-amazon|m\.media-amazon/i,
  },
];
