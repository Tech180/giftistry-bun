export interface UserPolicyState {
  id: string;
  isAdmin: boolean;
  isOwner: boolean;
  isDisabled: boolean;
  isHidden: boolean;
  loginAttemptsBeforeLockout: number;
  forcePasswordChange: boolean;
  policyJson: unknown;
}
