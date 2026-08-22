import type { MetadataPack } from './metadata-pack.interface';

const TECH_CATEGORIES = [
  'tech',
  'electronics',
  'computers',
  'computer',
  'computer_parts',
  'digital_tech',
];

const TECHNOLOGY_CPU_PACK: MetadataPack = {
  id: 'technology.cpu',
  label: 'CPU',
  description: 'Processor cores, clocks, socket, and related specs.',
  match: {
    categories: TECH_CATEGORIES,
    titleKeywords: ['cpu', 'processor', 'ryzen', 'core i', 'xeon', 'threadripper', 'epyc'],
  },
  fields: [
    { key: 'Cores', label: 'Cores', bucket: 'predefined', hint: 'physical core count' },
    { key: 'Threads', label: 'Threads', bucket: 'predefined', hint: 'thread count' },
    { key: 'BaseClock', label: 'Base clock', bucket: 'predefined', hint: 'base frequency, e.g. 3.7 GHz' },
    { key: 'BoostClock', label: 'Boost clock', bucket: 'predefined', hint: 'boost/turbo frequency, e.g. 4.6 GHz' },
    { key: 'Socket', label: 'Socket', bucket: 'predefined', hint: 'CPU socket, e.g. AM4, LGA1700' },
    { key: 'Tdp', label: 'TDP', bucket: 'predefined', hint: 'thermal design power, e.g. 65W' },
    { key: 'Cache', label: 'Cache', bucket: 'userDefined', hint: 'total cache when listed, e.g. 32MB' },
    {
      key: 'Architecture',
      label: 'Architecture',
      bucket: 'userDefined',
      hint: 'microarchitecture or family, e.g. Zen 3, Alder Lake',
    },
  ],
  promptFragment: `
CPU rules:
- Extract cores, threads, base/boost clocks, socket, TDP, cache, and architecture when the page lists them.
- Prefer the product spec table over marketing copy. Keep units (GHz, W, MB).
- Do not invent values. Omit a key when it is not on the page.
`.trim(),
};

const TECHNOLOGY_COMPUTER_PARTS_PACK: MetadataPack = {
  id: 'technology.computer-parts',
  label: 'Computer parts',
  description: 'Broader PC component specs such as form factor, interface, and wattage.',
  match: {
    categories: TECH_CATEGORIES,
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

export const METADATA_PACKS_CATALOG: MetadataPack[] = [
  {
    id: 'technology',
    label: 'Technology',
    description: 'Extra specs for electronics, computers, and gadgets during URL enrich.',
    match: {
      categories: TECH_CATEGORIES,
    },
    fields: [],
    promptFragment: `
Technology rules:
- Prefer structured spec fields over stuffing specs into Title or Description.
- Extra pack keys are allowed in PredefinedFields / UserDefinedFields; omit any key that is unknown.
`.trim(),
    children: [TECHNOLOGY_CPU_PACK, TECHNOLOGY_COMPUTER_PARTS_PACK],
  },
];

export const DEFAULT_ENABLED_PACK_IDS: readonly string[] = ['technology', 'technology.cpu'];

export function flattenMetadataPacks(packs: readonly MetadataPack[] = METADATA_PACKS_CATALOG): MetadataPack[] {
  const result: MetadataPack[] = [];
  const walk = (nodes: readonly MetadataPack[]): void => {
    for (const node of nodes) {
      result.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(packs);
  return result;
}

export function listCatalogPackIds(catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG): string[] {
  return flattenMetadataPacks(catalog).map((pack) => pack.id);
}

export function findPackById(
  id: string,
  catalog: readonly MetadataPack[] = METADATA_PACKS_CATALOG
): MetadataPack | undefined {
  return flattenMetadataPacks(catalog).find((pack) => pack.id === id);
}
