export const CLOUDFLARE_MARKERS = [
  'cf-browser-verification',
  'challenge-platform',
  'just a moment',
  'checking your browser',
] as const;

/** Hard vendor signatures safe to scan in the visible body. */
export const AKAMAI_MARKERS = [
  'akamaighost',
  '_incapsula_resource',
  'px-captcha',
  'datadome',
] as const;

/**
 * Soft Akamai interstitial copy — title/h1 only (never full body),
 * so cart drawers / reviews mentioning similar phrases do not false-positive.
 */
export const AKAMAI_TITLE_MARKERS = [
  'site maintenance',
  'oops, something went wrong',
  'error: 0.',
] as const;

/** Soft bot markers — only match in title/h1/short pages, never full body. */
export const BOT_CHECK_MARKERS = [
  'robot check',
  '403 forbidden',
  'request blocked',
] as const;

/** Vendor-specific captcha signatures safe to scan in body. */
export const VENDOR_CAPTCHA_MARKERS = [
  'cf-browser-verification',
  'px-captcha',
  '_incapsula_resource',
  'datadome',
] as const;

/** Amazon-host-only gate markers. */
export const AMAZON_GATE_MARKERS = [
  'continue shopping',
  'click the button below to continue',
] as const;
