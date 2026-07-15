export const STANDARD_CATEGORIES = [
  { id: 'digital_tech', label: 'Digital & Tech' },
  { id: 'cash_funds', label: 'Cash Funds' },
  { id: 'home_kitchen', label: 'Home & Kitchen' },
  { id: 'baby_kids', label: 'Baby & Kids' },
  { id: 'apparel_accessories', label: 'Apparel & Accessories' },
  { id: 'health_wellness', label: 'Health & Wellness' },
  { id: 'outdoors_travel', label: 'Outdoors & Travel' },
  { id: 'hobbies_entertainment', label: 'Hobbies & Entertainment' },
] as const;

export type StandardCategoryId = (typeof STANDARD_CATEGORIES)[number]['id'];
