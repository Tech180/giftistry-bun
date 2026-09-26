import type { ItemSubstitutionKind } from '../types/item-substitution-kind.type';

export interface ItemSubstitutionRow {
  Id: string;
  ParentItemId: string;
  SubstitutionItemId: string;
  Kind: ItemSubstitutionKind;
  CreatedByUserId: string;
  SortOrder: number;
  CreatedAt?: Date;
}
