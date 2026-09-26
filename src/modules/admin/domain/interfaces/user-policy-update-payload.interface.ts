import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';

export interface UserPolicyUpdatePayload {
  isAdmin?: boolean;
  isDisabled?: boolean;
  isHidden?: boolean;
  forcePasswordChange?: boolean;
  loginAttemptsBeforeLockout?: number;
  policy?: Partial<GiftistryUserPolicy>;
}
