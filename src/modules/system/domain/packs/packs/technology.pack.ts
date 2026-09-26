import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { TECH_CATEGORIES } from '../constants/tech-categories.constant';
import { TECHNOLOGY_COMPUTER_PARTS_PACK } from './technology.computer-parts.pack';
import { TECHNOLOGY_CPU_PACK } from './technology.cpu.pack';

export const TECHNOLOGY_PACK: MetadataPack = {
  id: 'technology',
  label: 'Technology',
  description: 'Extra specs for electronics, computers, and gadgets during URL enrich.',
  match: {
    categories: [...TECH_CATEGORIES],
  },
  fields: [
    {
      key: 'StorageCapacity',
      label: 'Storage capacity',
      bucket: 'predefined',
      hint: 'e.g. 256GB',
    },
    {
      key: 'RAM',
      label: 'RAM',
      bucket: 'userDefined',
      hint: 'e.g. 6GB or 8GB',
    },
  ],
  promptFragment: `
Technology rules:
- Prefer structured spec fields over stuffing specs into Title or Description.
- Strip marketing sub-names and feature nicknames (e.g. "Torque Drive", "World's Smallest…"). Keep core model identity (e.g. "V11", "Ring 5", "WH-1000XM5").
- When the brand is integral to the product identity (e.g. Oura Ring), keep it in Title; otherwise put Brand in UserDefinedFields.Brand.
- When page context lists product options (RAM, SSD, storage, memory, configuration), map them to custom fields:
  - Split combined values like "6G+128G" or "8G + 256G" into UserDefinedFields.RAM (e.g. "6GB" / "8GB") and PredefinedFields.StorageCapacity (e.g. "128GB" / "256GB") when possible.
  - Color options → PredefinedFields.Color and top-level "Color".
  - ModelNumber should be the product model (e.g. "Pocket MICRO 2"), not the store hostname or vendor slug.
- Selected Configuration / variant title in page context reflects the chosen RAM/storage/color combo.
- Example: "Oura Ring 5 - Silver - Size 8 - World's Smallest Smart Ring - …" → Title: "Oura Ring 5", Color: "Silver", Size: "8" (ring size → UserDefinedFields.Size).
- Example: "Dyson V11 Torque Drive Cordless Vacuum Cleaner, Blue" → Title: "V11 Cordless Vacuum Cleaner", Brand: "Dyson", Color: "Blue".
- Example: "Sony WH-1000XM5 Wireless Noise Canceling Headphones - Black" → Title: "WH-1000XM5", Brand: "Sony", Color: "Black".
- Extra pack keys are allowed in PredefinedFields / UserDefinedFields; omit any key that is unknown.
`.trim(),
  children: [TECHNOLOGY_CPU_PACK, TECHNOLOGY_COMPUTER_PARTS_PACK],
};
