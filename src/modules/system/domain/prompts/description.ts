export const DESCRIPTION_PROMPT = `
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
`.trim();
