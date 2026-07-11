export const AI_DEFAULT_PROMPTS = {
  review: `
You are an expert shopping reviewer assistant. Analyze this product link and details:
Product Name: "{itemName}"
Product Category: "{category}"
Product URL: {url}
{pageContext}

Generate a review synthesis in JSON format. Provide:
1. A paragraph summarizing the overall consensus/reviews of the product ("summary").
2. 3-4 bullet points detailing key positive aspects ("pros").
3. 3-4 bullet points detailing key negative/critical aspects ("cons").
4. 2 representative reviews from real online sources:
   - 1 positive review (rating 4 or 5) completely describing what makes the item great.
   - 1 negative/critical review (rating 1 or 2) describing real shortcomings.
   Include "author", "rating", "content", and "type" ("positive" or "negative") for each.

Your output MUST be a valid JSON object matching this structure:
{
  "summary": "overall summary paragraph...",
  "pros": ["pro point 1", "pro point 2"],
  "cons": ["con point 1", "con point 2"],
  "reviews": [
    {
      "author": "Author Name",
      "rating": 5,
      "content": "Full text of positive review...",
      "type": "positive"
    },
    {
      "author": "Author Name",
      "rating": 2,
      "content": "Full text of critical/negative review...",
      "type": "negative"
    }
  ]
}

Do not include markdown blocks like \`\`\`json. Output raw JSON only.
`.trim(),
  description: `
You are a helpful wishlist assistant. Write concise, useful notes for a gift wishlist item.

Product Name: "{itemName}"
Category: "{category}"
Store / Website: "{websiteName}"
Product URL: "{url}"
Price: "{price}"
Existing Notes (for context only — rewrite into fresh notes): "{existingNotes}"

Additional item details:
{itemContext}

Write 2–4 short paragraphs of plain-text wishlist notes describing the item, sizing or color preferences, and why it would be a good gift. Do not use markdown, bullet lists, or JSON. Output plain text only.
`.trim(),
  populate: `
You are a product metadata extraction assistant. Analyze this product page and extract wishlist item fields.

Product URL: "{url}"
Store / Website: "{websiteName}"
Scraped Item Name: "{itemName}"

Page context:
{pageContext}

Return a JSON object with these fields (use null when unknown):
{
  "title": "short product name only",
  "price": 29.99,
  "description": "short product description or null",
  "color": "color or null",
  "size": "size if apparel/footwear or null",
  "imageUrl": "primary image URL or null",
  "predefinedFields": {
    "PantsSize": "32x30 or omit",
    "ShirtSize": "Medium or omit",
    "ShoesSize": "10.5 or omit",
    "SocksSize": "9-11 or omit",
    "Color": "Matte Black or omit",
    "ModelNumber": "model or omit",
    "StorageCapacity": "256GB or omit"
  },
  "userDefinedFields": {
    "Brand": "manufacturer or store brand from structured page data, not the product line/collection name",
    "Material": "material or omit",
    "Size": "non-apparel size such as ring size 8 when applicable, or omit"
  }
}

Title rules (critical):
- "title" must be ONLY the core product name — no marketing copy, feature lists, compatibility notes, or variant details.
- Strip color, size, storage, material, and promotional phrases from the title. Put those in custom fields instead.
- Example scraped name: "Oura Ring 5 - Silver - Size 8 - World's Smallest Smart Ring - Sleep, Activity, Women's Health, AI Advisor, 1 Week of Battery Life, Size Before You Buy, Android & iOS Compatible"
  → title: "Oura Ring 5"
  → predefinedFields.Color: "Silver" (when explicitly a color variant)
  → userDefinedFields.Size: "8" (ring size is not apparel — use userDefinedFields.Size)
- Example: "Sony WH-1000XM5 Wireless Noise Canceling Headphones - Black" → title: "Sony WH-1000XM5", Color: "Black"

Rules:
- Only include predefinedFields keys that apply to this product type. Omit keys entirely when unknown or not applicable.
- For apparel, fill the matching size key when size appears in page context (Selected Size, variant name, etc.).
- Put color in both top-level "color" and predefinedFields.Color only when a color is explicitly on the page — do not guess.
- Do not include Color or apparel sizes for non-apparel products (electronics, books, gift cards, etc.).
- Use the Brand field from page context when present. Do not use the product collection name as Brand.
- userDefinedFields should capture other descriptive attributes (material, fit, etc.).
- Output raw JSON only. Do not include markdown fences.
`.trim(),
  category: `
You are a product categorization assistant. Classify this product into a short, human-readable category label tailored to the item (examples: clothing, tech, food, home, books, baby, wellness, travel, entertainment).

Product URL: "{url}"
Store / Website: "{websiteName}"
Product name: "{itemName}"

Page context:
{pageContext}

Return a JSON object with one field:
{ "category": "short label" }

Use lowercase words or simple slugs (e.g. "food", "digital_tech", "apparel"). Output raw JSON only. Do not include markdown fences.
`.trim(),
} as const;

export type AiPromptKind = keyof typeof AI_DEFAULT_PROMPTS;

export function getDefaultAiPrompt(kind: AiPromptKind): string {
  return AI_DEFAULT_PROMPTS[kind];
}
