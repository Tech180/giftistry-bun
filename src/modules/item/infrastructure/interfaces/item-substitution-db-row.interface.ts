import type { ItemSubstitutionKind } from '../../domain/types/item-substitution-kind.type';

export interface ItemSubstitutionDbRow {
  Id: string;
  ParentItemId: string;
  SubstitutionItemId: string;
  Kind: ItemSubstitutionKind;
  CreatedByUserId: string;
  SortOrder: number | string;
  CreatedAt?: Date | string | null;
}
