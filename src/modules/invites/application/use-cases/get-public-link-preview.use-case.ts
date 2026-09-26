import { AppError } from '@/common/domain/errors/app-error';
import type { ListItemsPort } from '@/modules/item';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ListLinkTokenRepository } from '../../domain/ports/list-link-token.repository';
import type { PublicLinkPreviewResult } from '../interfaces/public-link-preview-result.interface';
import { loadValidLinkInvite } from '../utils/load-valid-link-invite.util';

export class GetPublicLinkPreviewUseCase {
  constructor(
    private linkTokenRepo: ListLinkTokenRepository,
    private wishlistRepo: WishlistRepository,
    private listItems: ListItemsPort
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
      SupportsGuestRealtime: true,
    };
  }
}
