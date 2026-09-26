import type { ImportedItemPreview } from '@/modules/item';
import type { BackgroundJobItem } from '../../../domain/interfaces/background-job-item.interface';
import type { CreatedImportRow } from '../interfaces/created-import-row.interface';
import type { WishlistLinkIndexEntry } from '../interfaces/wishlist-link-index-entry.interface';
import { importItemDedupeKey } from './import-item-dedupe-key.util';
import { jobItemDedupeKey } from './job-item-dedupe-key.util';

export function partitionPreviewAgainstExisting(
  validItems: ImportedItemPreview[],
  existingItems: BackgroundJobItem[],
  wishlistByLink: Map<string, WishlistLinkIndexEntry>
): { remainder: ImportedItemPreview[]; orphanedOnList: CreatedImportRow[] } {
  const jobKeys = new Set(existingItems.map(jobItemDedupeKey));
  const remainder: ImportedItemPreview[] = [];
  const orphanedOnList: CreatedImportRow[] = [];
  const seenOrphanIds = new Set<string>();

  for (const item of validItems) {
    const key = importItemDedupeKey(item.name, item.websiteLink);
    if (jobKeys.has(key)) {
      continue;
    }

    const link = item.websiteLink?.trim().toLowerCase();
    const onList = link ? wishlistByLink.get(link) : undefined;
    if (onList) {
      if (!seenOrphanIds.has(onList.itemId)) {
        seenOrphanIds.add(onList.itemId);
        orphanedOnList.push({
          itemId: onList.itemId,
          linkUrl: onList.linkUrl,
          name: onList.name,
          description: onList.description,
          category: onList.category,
          priority: onList.priority,
          price: onList.price,
          websiteName: onList.websiteName,
        });
      }
      continue;
    }

    remainder.push(item);
  }

  return { remainder, orphanedOnList };
}
