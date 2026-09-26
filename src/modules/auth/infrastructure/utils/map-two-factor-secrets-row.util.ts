import type { TwoFactorSecrets } from '../../domain/interfaces/two-factor-secrets.interface';
import type { TwoFactorSecretsRow } from '../interfaces/two-factor-secrets-row.interface';

export function mapTwoFactorSecretsRow(row: TwoFactorSecretsRow): TwoFactorSecrets {
  return {
    twoFactorSecret: row.two_factor_secret,
    twoFactorRecoveryCodes: row.two_factor_recovery_codes,
  };
}
