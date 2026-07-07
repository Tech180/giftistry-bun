import type { ListLinkToken, ListLinkTokenPublic } from '../invite.entity';
import type { ShareRole } from '@/modules/wishlist/domain/list-share.entity';

export interface ListLinkTokenRepository {
  create(listId: string, tokenHash: string, role: ShareRole, createdBy: string, expiresAt?: Date | null, maxUses?: number | null, passwordHash?: string | null): Promise<ListLinkToken>;
  findByListId(listId: string): Promise<ListLinkTokenPublic[]>;
  findByTokenHash(tokenHash: string): Promise<ListLinkToken | null>;
  revoke(id: string, listId: string): Promise<void>;
  incrementUseCount(id: string): Promise<void>;
}
