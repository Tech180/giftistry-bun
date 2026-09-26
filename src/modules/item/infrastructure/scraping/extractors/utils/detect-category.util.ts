import { CATEGORY_KEYWORDS } from '../../../../domain/constants/category-keywords.constant';

const COMPILED_CATEGORY_REGEXES = Object.entries(CATEGORY_KEYWORDS).map(([cat, keywords]) => {
  const escapedKeywords = keywords
    .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return {
    category: cat,
    regex: new RegExp(`\\b(${escapedKeywords})\\b`, 'i'),
  };
});

export function detectCategoryFromUrlAndTitle(url: string, title: string): string | null {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();
    const textToScan = `${host} ${path} ${title.toLowerCase()}`;

    for (const { category, regex } of COMPILED_CATEGORY_REGEXES) {
      if (regex.test(textToScan)) return category;
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
}
