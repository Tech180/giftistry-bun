import type { AdminAccountStatus } from '../../domain/interfaces/admin-account-status.interface';
import type { AdminAccountStatusRow } from '../interfaces/admin-account-status-row.interface';

export function mapAdminAccountStatusRow(row: AdminAccountStatusRow): AdminAccountStatus {
  return {
    id: row.id,
    isAdmin: row.is_admin,
    isDisabled: row.is_disabled,
  };
}
