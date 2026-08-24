import type { MetadataPack } from '../metadata-pack.interface';
import { TECH_CATEGORIES } from './tech-categories.constant';

export const TECHNOLOGY_CPU_PACK: MetadataPack = {
  id: 'technology.cpu',
  label: 'CPU',
  description: 'Processor cores, clocks, socket, and related specs.',
  match: {
    categories: [...TECH_CATEGORIES],
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
