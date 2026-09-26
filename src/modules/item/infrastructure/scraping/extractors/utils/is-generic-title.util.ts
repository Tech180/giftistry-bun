import {
  GENERIC_PRODUCT_TITLES,
  GENERIC_PRODUCT_TITLE_SUBSTRINGS,
} from '../constants/generic-product-titles.constant';

export function isGenericTitle(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  if (!title) return true;
  if ((GENERIC_PRODUCT_TITLES as readonly string[]).includes(lowerTitle)) {
    return true;
  }
  return GENERIC_PRODUCT_TITLE_SUBSTRINGS.some((part) => lowerTitle.includes(part));
}
