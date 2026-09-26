import type { DeleteAccountStatus } from '../../domain/interfaces/delete-account-status.interface';
import type { DeleteAccountStatusRow } from '../interfaces/delete-account-status-row.interface';

export function mapDeleteAccountStatusRow(row: DeleteAccountStatusRow): DeleteAccountStatus {
  return {
    id: row.id,
    authHash: row.auth_hash,
    isAdmin: row.is_admin,
    isDisabled: row.is_disabled,
  };
}
