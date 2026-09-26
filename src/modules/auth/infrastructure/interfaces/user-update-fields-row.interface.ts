export interface UserUpdateFieldsRow {
  email_verified: boolean;
  email_verification_token: string | null;
  email_verification_expires: Date | string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_recovery_codes: string | null;
  is_admin: boolean;
  ai_enabled: boolean;
  web_search_enabled: boolean;
  is_onboarded: boolean;
}
