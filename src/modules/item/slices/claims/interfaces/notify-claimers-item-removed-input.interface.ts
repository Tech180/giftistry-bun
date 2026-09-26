import type { Claim } from '../../../domain/interfaces/claim.interface';

export interface NotifyClaimersItemRemovedInput {
  claims: Pick<Claim, 'UserId'>[];
  itemName: string;
  listId: string;
  listTitle: string;
  /** List owner — never notified. */
  excludeUserId?: string | null;
}
