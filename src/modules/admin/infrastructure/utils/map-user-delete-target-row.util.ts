import type { UserDeleteTarget } from '../../domain/interfaces/user-delete-target.interface';
import type { UserDeleteTargetRow } from '../interfaces/user-delete-target-row.interface';

export function mapUserDeleteTargetRow(target: UserDeleteTargetRow): UserDeleteTarget {
  return {
    id: target.id,
    isAdmin: target.is_admin,
    isDisabled: target.is_disabled,
    isOwner: target.is_owner,
  };
}
