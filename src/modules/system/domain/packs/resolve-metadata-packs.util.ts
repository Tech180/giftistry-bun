import { isAlwaysOnPackMatch } from './is-always-on-pack-match.util';
import type { MetadataPack } from './metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from './metadata-packs.catalog';

function normalizeCategoryToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return (
    trimmed
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || ''
  );
}

export interface ResolveMetadataPacksInput {
  enabledPackIds: readonly string[];
  category: string | null;
  itemName: string;
  catalog?: readonly MetadataPack[];
}

interface FlatPackEntry {
  pack: MetadataPack;
  depth: number;
  index: number;
  parentId: string | null;
}

function flattenWithDepth(
  packs: readonly MetadataPack[],
  depth = 0,
  parentId: string | null = null,
  acc: FlatPackEntry[] = []
): FlatPackEntry[] {
  for (const pack of packs) {
    acc.push({ pack, depth, index: acc.length, parentId });
    if (pack.children?.length) {
      flattenWithDepth(pack.children, depth + 1, pack.id, acc);
    }
  }
  return acc;
}

function packMatches(pack: MetadataPack, category: string | null, itemName: string): boolean {
  if (isAlwaysOnPackMatch(pack.match)) return true;

  const normalizedCategory = category ? normalizeCategoryToken(category) : '';
  const categoryHit =
    !!normalizedCategory &&
    pack.match.categories.some((entry) => normalizeCategoryToken(entry) === normalizedCategory);
  if (categoryHit) return true;

  const title = itemName.toLowerCase();
  if (!title) return false;
  return (pack.match.titleKeywords ?? []).some((keyword) => title.includes(keyword.toLowerCase()));
}

export function resolveMetadataPacks(input: ResolveMetadataPacksInput): MetadataPack[] {
  const catalog = input.catalog ?? METADATA_PACKS_CATALOG;
  const enabled = new Set(input.enabledPackIds);
  const flat = flattenWithDepth(catalog);

  const matching = flat.filter(
    ({ pack }) => enabled.has(pack.id) && packMatches(pack, input.category, input.itemName)
  );
  const matchingIds = new Set(matching.map((entry) => entry.pack.id));

  const inject = matching.filter(({ pack }) => {
    const childMatched = (pack.children ?? []).some((child) => matchingIds.has(child.id));
    return !childMatched;
  });

  inject.sort((a, b) => b.depth - a.depth || a.index - b.index);
  return inject.map((entry) => entry.pack);
}
