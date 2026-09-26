import type { GrantedVia } from '../types/granted-via.type';
import type { ShareRole } from '../types/share-role.type';

export interface ListShare {
  Id: string;
  ListId: string;
  UserId: string;
  Role: ShareRole;
  GrantedVia?: GrantedVia;
  CreatedAt?: Date;
}
