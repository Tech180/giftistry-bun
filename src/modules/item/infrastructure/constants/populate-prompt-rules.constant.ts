export const RECONCILE_RULES = `
Reconcile rules (critical — apply when web search context is provided):
- Compare Product page context (authoritative for price and official variant options) with Web search context (fills missing specs, cross-checks model numbers).
- Prefer product page data when both sources agree; use web search only to fill gaps or resolve conflicts.
- Price and official configuration options from the product page take precedence over third-party listings.
- Description must remain spec-free; put RAM, storage, color, size, and model details ONLY in PredefinedFields / UserDefinedFields.
`.trim();

/** Short guidance for the JSON Description field — never the wishlist-notes prompt. */
export const POPULATE_DESCRIPTION_FIELD_GUIDANCE = `
The JSON "Description" value must be 1–2 plain sentences about what the product is and its primary use.
Put that copy ONLY in "Description" — never in PredefinedFields / UserDefinedFields keys such as Note, Notes, Summary, Features, BestGiftFor, or Overview.
Custom fields are for structured attributes only (Brand, ModelNumber, Color, Size, RAM, StorageCapacity, etc.).
`.trim();

export const POPULATE_JSON_ONLY_FOOTER = `
=== Output Contract (critical) ===
Return ONE JSON object matching the populate schema above.
- "Title" is REQUIRED and must be a short gift-list name (brand + model + short type when helpful). Never omit Title. Never copy the full marketplace SEO title.
- "Description" is REQUIRED when page context has product copy — put it in the top-level Description field only.
- Put Brand only under UserDefinedFields.Brand (not a top-level Brand key). Put other attributes only under PredefinedFields / UserDefinedFields as string values (never arrays).
- Do not invent Note / Notes / Summary / Features / BestGiftFor fields for product prose.
- Use Category-section guidance only if helpful for fields; do not emit a separate category response.
- Do not ask for missing placeholders. Product URL, name, category, store, and page context are already provided above.
- Output raw JSON only. No markdown fences, no preamble, no follow-up questions.
`.trim();
