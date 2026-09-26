import type { GiftistryUserPolicy } from './giftistry-user-policy.interface';

export interface UserPolicyContext {
  Id: string;
  IsAdmin?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | null;
  Policy: GiftistryUserPolicy;
}
