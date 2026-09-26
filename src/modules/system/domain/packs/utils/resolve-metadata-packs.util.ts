import { isAlwaysOnPackMatch } from './is-always-on-pack-match.util';
import type { MetadataPack } from '../interfaces/metadata-pack.interface';
import { METADATA_PACKS_CATALOG } from '../constants/metadata-packs-catalog.constant';
import type { ResolveMetadataPacksInput } from '../interfaces/resolve-metadata-packs-input.interface';
import { normalizeCategoryToken } from './normalize-category-token.util';

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

function withEnabledAncestors(
  leaves: FlatPackEntry[],
  flat: FlatPackEntry[],
  enabled: ReadonlySet<string>
): FlatPackEntry[] {
  const byId = new Map(flat.map((entry) => [entry.pack.id, entry]));
  const selected = new Map<string, FlatPackEntry>();

  for (const leaf of leaves) {
    selected.set(leaf.pack.id, leaf);
    let parentId = leaf.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      if (enabled.has(parent.pack.id)) {
        selected.set(parent.pack.id, parent);
      }
      parentId = parent.parentId;
    }
  }

  return [...selected.values()].sort((a, b) => a.depth - b.depth || a.index - b.index);
}

export function resolveMetadataPacks(input: ResolveMetadataPacksInput): MetadataPack[] {
  const catalog = input.catalog ?? METADATA_PACKS_CATALOG;
  const enabled = new Set(input.enabledPackIds);
  const flat = flattenWithDepth(catalog);

  const matching = flat.filter(
    ({ pack }) => enabled.has(pack.id) && packMatches(pack, input.category, input.itemName)
  );
  const matchingIds = new Set(matching.map((entry) => entry.pack.id));

  const leaves = matching.filter(({ pack }) => {
    const childMatched = (pack.children ?? []).some((child) => matchingIds.has(child.id));
    return !childMatched;
  });

  return withEnabledAncestors(leaves, flat, enabled).map((entry) => entry.pack);
}
