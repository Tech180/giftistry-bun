import type { Item } from '../../../domain/interfaces/item.interface';
import type { ItemClaimSummary } from '../../../domain/interfaces/item-claim-summary.interface';
import type { ItemDescriptionMetadata } from '../../../domain/interfaces/item-description-metadata.interface';
import type { ItemLink } from '../../../domain/interfaces/item-link.interface';

export function toGuestItemDto(input: {
  item: Item;
  links: ItemLink[];
  metadata: ItemDescriptionMetadata | null;
  categoryKey: string;
  categoryLabel: string;
  claimSummary: ItemClaimSummary;
}): Record<string, unknown> {
  const { item, links, metadata, categoryKey, categoryLabel, claimSummary } = input;
  return {
    Id: item.Id,
    ListId: item.ListId,
    PriorityId: item.PriorityId,
    Name: item.Name,
    Description:
      metadata?.Text ?? (item.Description?.startsWith('{') ? null : item.Description),
    Category: item.Category,
    CategoryKey: categoryKey,
    CategoryLabel: categoryLabel,
    Priority: item.Priority,
    CreatedAt: item.CreatedAt,
    Links: links,
    Photos: item.Photos ?? [],
    Metadata: metadata,
    IsFavorite: item.IsFavorite === true || metadata?.IsFavorite === true,
    IsPinned: item.IsPinned === true || metadata?.IsPinned === true,
    MultiCount: item.MultiCount === true || metadata?.MultiCount === true,
    IsClaimed: false,
    ...claimSummary,
    DesiredQuantity: item.DesiredQuantity ?? metadata?.DesiredQuantity ?? null,
  };
}
