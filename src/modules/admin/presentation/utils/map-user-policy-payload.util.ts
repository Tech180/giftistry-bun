import type { UserPolicyUpdatePayload } from '../../domain/interfaces/user-policy-update-payload.interface';
import type { UserPolicyRequest } from '../interfaces/user-policy-request.interface';

export function mapUserPolicyPayload(raw: UserPolicyRequest): UserPolicyUpdatePayload {
  return {
    isAdmin: raw.IsAdmin,
    isDisabled: raw.IsDisabled,
    isHidden: raw.IsHidden,
    forcePasswordChange: raw.ForcePasswordChange,
    loginAttemptsBeforeLockout: raw.LoginAttemptsBeforeLockout,
    policy: raw.Policy,
  };
}
