export const POPULATE_PROMPT_COMPACT = `
You are a product metadata extraction assistant. Extract wishlist fields as ONE JSON object.

Product URL: "{url}"
Store: "{websiteName}"
Item name: "{itemName}"
Category: "{category}"

Page context:
{pageContext}

Web search context:
{searchContext}

Return JSON (null when unknown):
{
  "Title": "short gift-list name (brand+model+type when helpful)",
  "Price": 29.99,
  "Description": "1-2 plain sentences, no specs/color/size",
  "Color": "color or null",
  "Size": "apparel size or null",
  "DesiredQuantity": null,
  "ImageUrl": "primary image URL or null",
  "PredefinedFields": { "ShirtSize": "omit if N/A", "PantsSize": "omit", "ShoesSize": "omit", "SocksSize": "omit", "Color": "omit", "ModelNumber": "omit" },
  "UserDefinedFields": { "Brand": "omit if N/A", "Material": "omit" }
}

Rules:
- Title: short; strip SEO fluff, color/size/pack counts, SKU codes. Prefer model + type.
- Description: ONLY in Description field; never in Note/Features custom fields. Specs go in PredefinedFields/UserDefinedFields.
- Apparel: set exactly one of ShirtSize/PantsSize/ShoesSize/SocksSize when size is known.
- Output raw JSON only. No markdown fences.
`.trim();
