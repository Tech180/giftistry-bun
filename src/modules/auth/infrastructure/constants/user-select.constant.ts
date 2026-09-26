export const USER_SELECT = `
  id as "Id", username as "Username", email as "Email", first_name as "FirstName",
  last_name as "LastName", auth_hash as "AuthHash", created_at as "CreatedAt", bio as "Bio",
  theme as "Theme", avatar as "Avatar", birthday as "Birthday", email_verified as "EmailVerified",
  two_factor_enabled as "TwoFactorEnabled", is_admin as "IsAdmin", is_owner as "IsOwner",
  last_online as "LastOnline", last_login_at as "LastLoginAt",
  is_disabled as "IsDisabled", is_hidden as "IsHidden", locked_until as "LockedUntil",
  failed_login_count as "FailedLoginCount", force_password_change as "ForcePasswordChange",
  login_attempts_before_lockout as "LoginAttemptsBeforeLockout", session_version as "SessionVersion",
  policy_json as "PolicyJson", ai_enabled as "AiEnabled", web_search_enabled as "WebSearchEnabled",
  is_onboarded as "IsOnboarded", oauth_sub as "OauthSub", tour_json as "TourJson"
`;
