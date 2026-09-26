import type { MetadataPack } from '../interfaces/metadata-pack.interface';

export const KITCHEN_PACK: MetadataPack = {
  id: 'kitchen',
  label: 'Kitchen',
  description: 'Capacity and cookware fields for home and kitchen products.',
  match: {
    categories: ['kitchen', 'home_kitchen', 'home', 'cooking', 'bakeware', 'cookware'],
    titleKeywords: [
      'skillet',
      'dutch oven',
      'instant pot',
      'air fryer',
      'knife set',
      'cutting board',
      'bakeware',
    ],
  },
  fields: [
    { key: 'Capacity', label: 'Capacity', bucket: 'userDefined', hint: 'e.g. 6 qt, 12 cup' },
    {
      key: 'Material',
      label: 'Material',
      bucket: 'userDefined',
      hint: 'e.g. stainless steel, cast iron',
    },
    {
      key: 'PieceCount',
      label: 'Piece count',
      bucket: 'userDefined',
      hint: 'set piece count when sold as a set',
    },
    {
      key: 'Dimensions',
      label: 'Dimensions',
      bucket: 'userDefined',
      hint: 'single short dimension string when listed',
    },
    {
      key: 'DishwasherSafe',
      label: 'Dishwasher safe',
      bucket: 'userDefined',
      hint: 'Yes or No when explicitly stated',
    },
  ],
  promptFragment: `
Kitchen rules:
- Prefer capacity and material in fields, not Title.
- Put Brand in UserDefinedFields.Brand unless the brand is the product identity (e.g. Instant Pot).
- Omit any key that is unknown.
`.trim(),
};
