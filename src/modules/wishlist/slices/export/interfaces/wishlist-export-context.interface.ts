import type { ListRoleLevel } from '@/common/domain/types/list-role-level.type';

export interface WishlistExportContext {
  exporterName: string | undefined;
  isOwner: boolean;
  currentUserId: string;
  listRole: ListRoleLevel;
}
