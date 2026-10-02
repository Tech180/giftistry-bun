export const CATEGORY_PROMPT_COMPACT = `
Classify this product into a short category label.

URL: "{url}"
Store: "{websiteName}"
Name: "{itemName}"
Existing wishlist categories (prefer verbatim when they fit): {existingCategories}

Page context:
{pageContext}

Return JSON only:
{ "Category": "best label", "Alternatives": ["second", "third"] }

Prefer existing labels when reasonable. Otherwise use a short lowercase slug (e.g. apparel_accessories, digital_tech). Max 2 alternatives. No markdown.
`.trim();
