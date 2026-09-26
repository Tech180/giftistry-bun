import { parseJsonField } from '@/common/utils/parse-json-field.util';
import type { UserPasskey } from '../../domain/interfaces/user-passkey.interface';
import type { UserPasskeyRow } from '../interfaces/user-passkey-row.interface';

export function mapUserPasskeyRow(row: UserPasskeyRow): UserPasskey {
  return {
    Id: row.Id,
    UserId: row.UserId,
    CredentialId: row.CredentialId,
    PublicKey: row.PublicKey,
    Counter: Number(row.Counter),
    BackedUp: row.BackedUp,
    Transports: parseJsonField<string[]>(row.Transports, []),
  };
}
