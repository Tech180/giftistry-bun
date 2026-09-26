import type { Item, ItemMetadataWrite } from '@/modules/item';
import { resolveItemMetadata } from '@/modules/item';
import { remapIds } from './remap-ids.util';

export function toCloneMetadataWrite(
  item: Item,
  options: { includeLinks: boolean; idMap?: Map<string, string> }
): ItemMetadataWrite {
  const metadata = resolveItemMetadata(item);
  const write: ItemMetadataWrite = {
    IsFavorite: item.IsFavorite === true || metadata?.IsFavorite === true,
    IsPinned: item.IsPinned === true || metadata?.IsPinned === true,
    DesiredQuantity: item.DesiredQuantity ?? metadata?.DesiredQuantity ?? null,
    MultiCount: item.MultiCount === true || metadata?.MultiCount === true,
    AllowSubstitutions: item.AllowSubstitutions !== false,
    CustomFields: metadata?.CustomFields ?? item.CustomFields ?? null,
    Variations: metadata?.Variations ?? item.Variations ?? null,
    Photos: item.Photos ?? [],
  };

  if (options.includeLinks && options.idMap) {
    const linked = remapIds(item.LinkedItemIds ?? metadata?.LinkedItemIds, options.idMap);
    const related = remapIds(item.RelatedItemIds ?? metadata?.RelatedItemIds, options.idMap);
    // Linked/related are applied via replace* after create; keep write free of them.
    void linked;
    void related;
  }

  return write;
}
