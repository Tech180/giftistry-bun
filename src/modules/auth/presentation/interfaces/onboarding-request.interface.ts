import type { RegistrationMode } from '@/common/domain/types/registration-mode.type';

export interface OnboardingRequest {
  SkipStep?: string;
  CompleteUser?: boolean;
  CompleteOwner?: boolean;
  SkipOwner?: boolean;
  Username?: string;
  FirstName?: string;
  LastName?: string;
  Bio?: string;
  Theme?: string;
  PublicAppUrl?: string;
  RegistrationMode?: RegistrationMode;
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
