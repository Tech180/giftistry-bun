import type { EmailVerificationLookup } from '../../domain/interfaces/email-verification-lookup.interface';
import type { EmailVerificationRow } from '../interfaces/email-verification-row.interface';

export function mapEmailVerificationRow(row: EmailVerificationRow): EmailVerificationLookup {
  return {
    id: row.id,
    emailVerificationExpires: new Date(row.email_verification_expires),
  };
}
