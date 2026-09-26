import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';

export interface UserPolicyRequest {
  IsAdmin?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  ForcePasswordChange?: boolean;
  LoginAttemptsBeforeLockout?: number;
  Policy?: Partial<GiftistryUserPolicy>;
}
