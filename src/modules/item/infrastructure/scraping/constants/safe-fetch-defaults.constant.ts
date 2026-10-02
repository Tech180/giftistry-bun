export const DEFAULT_SAFE_FETCH_MAX_HTML_BYTES = 5 * 1024 * 1024;
export const DEFAULT_SAFE_FETCH_MAX_REDIRECTS = 5;
export const DEFAULT_SAFE_FETCH_ALLOWED_PORTS = new Set([80, 443]);

export const SAFE_FETCH_HTML_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'text/plain',
  'application/json',
] as const;
