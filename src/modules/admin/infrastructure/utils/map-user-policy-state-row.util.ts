import type { UserPolicyState } from '../../domain/interfaces/user-policy-state.interface';
import type { UserPolicyStateRow } from '../interfaces/user-policy-state-row.interface';

export function mapUserPolicyStateRow(target: UserPolicyStateRow): UserPolicyState {
  return {
    id: target.id,
    isAdmin: target.is_admin,
    isOwner: target.is_owner,
    isDisabled: target.is_disabled,
    isHidden: target.is_hidden,
    loginAttemptsBeforeLockout: target.login_attempts_before_lockout,
    forcePasswordChange: target.force_password_change,
    policyJson: target.policy_json,
  };
}
