import type { ItemSubstitutionRow } from '../../domain/interfaces/item-substitution-row.interface';
import type { ItemSubstitutionDbRow } from '../interfaces/item-substitution-db-row.interface';

export function mapItemSubstitutionRow(row: ItemSubstitutionDbRow): ItemSubstitutionRow {
  return {
    Id: row.Id,
    ParentItemId: row.ParentItemId,
    SubstitutionItemId: row.SubstitutionItemId,
    Kind: row.Kind,
    CreatedByUserId: row.CreatedByUserId,
    SortOrder: Number(row.SortOrder) || 0,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
  };
}
