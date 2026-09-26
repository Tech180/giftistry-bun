import type { ShareRole } from '@/modules/wishlist';
import type { ListLinkToken } from '../interfaces/list-link-token.interface';
import type { ListLinkTokenPublic } from '../interfaces/list-link-token-public.interface';

export interface ListLinkTokenRepository {
  create(
    listId: string,
    tokenHash: string,
    token: string,
    role: ShareRole,
    createdBy: string,
    expiresAt?: Date | null,
    maxUses?: number | null,
    passwordHash?: string | null
  ): Promise<ListLinkToken>;
  findByListId(listId: string): Promise<ListLinkTokenPublic[]>;
  findByTokenHash(tokenHash: string): Promise<ListLinkToken | null>;
  revoke(id: string, listId: string): Promise<void>;
  incrementUseCount(id: string): Promise<void>;
}
