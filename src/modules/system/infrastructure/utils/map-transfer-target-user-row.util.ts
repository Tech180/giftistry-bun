import type { TransferTargetUser } from '../../domain/interfaces/transfer-target-user.interface';
import type { TransferTargetUserRow } from '../interfaces/transfer-target-user-row.interface';

export function mapTransferTargetUserRow(row: TransferTargetUserRow): TransferTargetUser {
  return {
    id: row.id,
    username: row.username,
    isDisabled: row.IsDisabled,
  };
}
