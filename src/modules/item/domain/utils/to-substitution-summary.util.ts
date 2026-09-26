import type { Claim } from '../interfaces/claim.interface';
import type { Item } from '../interfaces/item.interface';
import type { ItemLink } from '../interfaces/item-link.interface';
import type { ItemSubstitutionSummary } from '../interfaces/item-substitution-summary.interface';

export function toSubstitutionSummary(
  item: Item,
  links: ItemLink[],
  claims: Claim[]
): ItemSubstitutionSummary {
  return {
    Id: item.Id,
    Name: item.Name,
    Description: item.Description,
    Category: item.Category || 'uncategorized',
    PriorityId: item.PriorityId ?? null,
    Priority: item.Priority ?? null,
    IsHiddenIdea: item.IsHiddenIdea === true,
    IsFavorite: item.IsFavorite === true,
    IsPinned: item.IsPinned === true,
    DesiredQuantity: item.DesiredQuantity ?? null,
    MultiCount: item.MultiCount === true,
    CustomFields: item.CustomFields ?? null,
    Variations: item.Variations ?? null,
    Links: links,
    Photos: item.Photos ?? [],
    Claims: claims,
    IsClaimed: claims.length > 0,
    IsFullyClaimed: claims.some((c) => c.Amount === null),
  };
}
