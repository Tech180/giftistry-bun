export const TITLE_LINE_RE =
  /^(?:★ | {2})(.+?)(?: - \$([0-9]+(?:\.[0-9]{2})?))?(?:\s+\(Priority:\s*(\d+)\))?\s*$/;
export const CATEGORY_RE = /^\[([^\]]+)\]\s*$/;
export const LINK_RE = /^\s{4}Link:\s+.+?\s+\((.+?)\)\s*$/;
export const DESCRIPTION_RE = /^\s*Description:\s*(.*)\s*$/;
export const REGISTRY_RE = /^WISHLIST REGISTRY:\s+(.+)\s*$/i;
