import type { ShareRole } from '../../domain/types/share-role.type';
import type { GrantedVia } from '../../domain/types/granted-via.type';

export interface ListShareRow {
  Id: string;
  ListId: string;
  UserId: string;
  Role: ShareRole;
  GrantedVia: GrantedVia | null;
  CreatedAt: Date | string | null;
}
