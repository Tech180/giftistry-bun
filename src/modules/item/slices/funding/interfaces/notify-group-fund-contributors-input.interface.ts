import type { Claim } from '../../../domain/interfaces/claim.interface';

export interface NotifyGroupFundContributorsInput {
  /** Prior claims on the item before the new contribution was written. */
  priorClaims: Pick<Claim, 'UserId' | 'Amount'>[];
  itemId: string;
  itemName: string;
  listId: string;
  listTitle: string;
  amount: number;
  isStart: boolean;
  actorUserId: string | null;
  /** List owner — never notified. */
  ownerUserId?: string | null;
}
