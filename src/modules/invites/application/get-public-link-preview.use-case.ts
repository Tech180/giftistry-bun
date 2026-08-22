import type { ListLinkTokenRepository } from '../domain/ports/list-link-token.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ListItemsUseCase, ListItemsResult } from '@/modules/item/application/list-items.use-case';
import { AppError } from '@/common/middlewares/error.middleware';
import { loadValidLinkInvite } from './load-valid-link-invite.util';

export interface PublicLinkPreviewWishlist {
  Id: string;
  Title: string;
  Category?: string;
  ExpiresAt: Date | null;
  IsActive: boolean;
  AllowGroupFunds: boolean;
  OwnerUsername?: string;
  OwnerFirstName?: string;
  OwnerLastName?: string;
  OwnerAvatar?: string | null;
}

export interface PublicLinkPreviewResult {
  Wishlist: PublicLinkPreviewWishlist;
  Items: ListItemsResult['Items'];
  Groups: ListItemsResult['Groups'];
}

export class GetPublicLinkPreviewUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private wishlistRepo: WishlistRepository,
    private listItems: ListItemsUseCase
  ) {}

  async execute(token: string, password?: string | null): Promise<PublicLinkPreviewResult> {
    const linkInvite = await loadValidLinkInvite(this.linkTokenRepo, token);

    if (linkInvite.PasswordHash) {
      if (!password) {
        throw new AppError('Password is required to access this wishlist', 401, 'UNAUTHORIZED');
      }
      const isMatch = await Bun.password.verify(password, linkInvite.PasswordHash);
      if (!isMatch) {
        throw new AppError('Invalid password', 401, 'UNAUTHORIZED');
      }
    }

    const wishlist = await this.wishlistRepo.findById(linkInvite.ListId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const items = await this.listItems.execute(wishlist.Id, null);

    return {
      Wishlist: {
        Id: wishlist.Id,
        Title: wishlist.Title,
        Category: wishlist.Category,
        ExpiresAt: wishlist.ExpiresAt,
        IsActive: wishlist.IsActive,
        AllowGroupFunds: wishlist.AllowGroupFunds,
        OwnerUsername: wishlist.OwnerUsername,
        OwnerFirstName: wishlist.OwnerFirstName,
        OwnerLastName: wishlist.OwnerLastName,
        OwnerAvatar: wishlist.OwnerAvatar ?? null,
      },
      Items: items.Items,
      Groups: items.Groups,
    };
  }
}
