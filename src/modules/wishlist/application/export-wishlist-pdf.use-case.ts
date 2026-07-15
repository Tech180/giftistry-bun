import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { ListItemsUseCase } from '@/modules/item/application/list-items.use-case';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import type { ThemeResolver } from './ports/theme-resolver.port';
import type { PdfGenerator } from './ports/pdf-generator.port';

export class ExportWishlistPdfUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private listItemsUseCase: ListItemsUseCase,
    private userRepo: UserRepository,
    private themeResolver: ThemeResolver,
    private pdfGenerator: PdfGenerator
  ) {}

  async execute(listId: string, currentUserId: string): Promise<Uint8Array> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const user = await this.userRepo.findById(wishlist.UserId);
    const themeColors = await this.themeResolver.resolveThemeColors(user?.Theme || 'default');

    const items = await this.listItemsUseCase.execute(listId, currentUserId);

    const ownerName = (wishlist.OwnerFirstName && wishlist.OwnerLastName)
      ? `${wishlist.OwnerFirstName} ${wishlist.OwnerLastName}`
      : (wishlist.OwnerFirstName || wishlist.OwnerUsername || 'Registry Owner');

    const ownerInfo = {
      name: ownerName,
      username: wishlist.OwnerUsername || 'user',
      avatarUrl: wishlist.OwnerAvatar || undefined,
    };

    return await this.pdfGenerator.generateWishlistPdf(wishlist, items, themeColors, ownerInfo);
  }
}
