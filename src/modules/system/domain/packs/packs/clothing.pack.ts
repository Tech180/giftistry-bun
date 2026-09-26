import type { MetadataPack } from '../interfaces/metadata-pack.interface';

export const CLOTHING_PACK: MetadataPack = {
  id: 'clothing',
  label: 'Clothing',
  description: 'Fit and apparel details beyond core size keys.',
  match: {
    categories: ['clothing', 'apparel', 'apparel_accessories', 'fashion', 'shoes', 'footwear'],
    titleKeywords: [
      'hoodie',
      't-shirt',
      'tee',
      'jeans',
      'sneakers',
      'dress',
      'jacket',
      'socks',
      'clog',
      'clogs',
      'sandal',
      'sandals',
      'shoe',
      'shoes',
    ],
  },
  fields: [
    { key: 'Fit', label: 'Fit', bucket: 'userDefined', hint: 'e.g. Slim, Boxy, Relaxed' },
    { key: 'Neckline', label: 'Neckline', bucket: 'userDefined', hint: 'when relevant' },
    { key: 'Length', label: 'Length', bucket: 'userDefined', hint: 'e.g. Crop, Ankle, Midi' },
    {
      key: 'Pattern',
      label: 'Pattern',
      bucket: 'userDefined',
      hint: 'e.g. Solid, Striped — not Color',
    },
    { key: 'Care', label: 'Care', bucket: 'userDefined', hint: 'short wash/care line when useful' },
  ],
  promptFragment: `
Clothing rules:
- Put Brand in UserDefinedFields.Brand; do not prefix Title with the brand.
- Strip gender marketing prefixes (Women's, Men's, Kids') when they are not part of the product name itself.
- Prefer core apparel size keys (ShirtSize / PantsSize / ShoesSize / SocksSize) over a generic Size.
- Material goes in UserDefinedFields.Material when listed.
- Example: "Life Is Good Women's Solid French Terry Boxy Full-Zip Hoodie" → Title: "Solid French Terry Boxy Full-Zip Hoodie", Brand: "Life Is Good".
- Example: "Crocs Classic Clog" → Title: "Classic Clog", Brand: "Crocs".
- Example: "mosanana Oval Cat Eye Sunglasses for Women Retro Y2K Style MS52372 | Geometric Stylish…" → Title: "Oval Cat Eye Sunglasses", Brand: "mosanana", ModelNumber: "MS52372".
- Omit any key that is unknown.
`.trim(),
};
