export interface UserPolicyStateRow {
  id: string;
  is_admin: boolean;
  is_owner: boolean;
  is_disabled: boolean;
  is_hidden: boolean;
  login_attempts_before_lockout: number;
  force_password_change: boolean;
  policy_json: unknown;
}
