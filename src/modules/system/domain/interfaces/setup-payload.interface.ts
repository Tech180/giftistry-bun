import type { AdminSetupCredentials } from './admin-setup-credentials.interface';

export interface SetupPayload {
  DbType: string;
  DbUrl?: string;
  /** Optional; defaults to local (env/Mailpit) when omitted from first-run setup. */
  SmtpType?: string;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  Admin: AdminSetupCredentials;
  SetupToken?: string;
}
