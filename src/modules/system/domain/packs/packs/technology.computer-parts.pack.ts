import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { TECH_CATEGORIES } from '../constants/tech-categories.constant';

export const TECHNOLOGY_COMPUTER_PARTS_PACK: MetadataPack = {
  id: 'technology.computer-parts',
  label: 'Computer parts',
  description: 'Broader PC component specs such as form factor, interface, and wattage.',
  match: {
    categories: [...TECH_CATEGORIES],
    titleKeywords: [
      'motherboard',
      'gpu',
      'graphics card',
      'ram',
      'psu',
      'power supply',
      'nvme',
      'ssd',
      'cooler',
      'case',
    ],
  },
  fields: [
    { key: 'FormFactor', label: 'Form factor', bucket: 'userDefined', hint: 'e.g. ATX, mITX, 2.5 in' },
    { key: 'Interface', label: 'Interface', bucket: 'userDefined', hint: 'e.g. PCIe 4.0 x16, SATA, DDR4' },
    { key: 'Wattage', label: 'Wattage', bucket: 'userDefined', hint: 'PSU or board power, e.g. 750W' },
    { key: 'MemoryType', label: 'Memory type', bucket: 'userDefined', hint: 'e.g. DDR4, DDR5, GDDR6' },
    {
      key: 'PcieGeneration',
      label: 'PCIe generation',
      bucket: 'userDefined',
      hint: 'e.g. PCIe 4.0, PCIe 5.0',
    },
  ],
  promptFragment: `
Computer parts rules:
- Extract form factor, interface, wattage, memory type, and PCIe generation when listed.
- Shared keys with CPU (socket, TDP) may also apply to motherboards and coolers; fill them when present.
- Omit keys that do not apply to this part type.
`.trim(),
};
