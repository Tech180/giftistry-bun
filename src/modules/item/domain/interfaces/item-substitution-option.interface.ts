import type { ItemSubstitutionKind } from '../types/item-substitution-kind.type';
import type { ItemSubstitutionSummary } from './item-substitution-summary.interface';

export interface ItemSubstitutionOption {
  Id: string;
  Kind: ItemSubstitutionKind;
  SortOrder: number;
  CreatedByUserId: string;
  Item: ItemSubstitutionSummary;
}
