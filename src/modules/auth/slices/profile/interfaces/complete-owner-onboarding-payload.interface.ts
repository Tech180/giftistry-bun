export interface CompleteOwnerOnboardingPayload {
  Skip?: boolean;
  PublicAppUrl?: string;
  RegistrationMode?: 'open' | 'invite_only' | 'disabled';
  SmtpType?: 'local' | 'remote';
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  AiEnabled?: boolean;
  AiWebSearchEnabled?: boolean;
}
