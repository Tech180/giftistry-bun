import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { ListItemsPort } from '@/modules/item';
import type { UserRepository } from '@/modules/auth';
import { AppError } from '@/common/domain/errors/app-error';
import type { ThemeResolver } from '../../../application/ports/theme-resolver.port';
import type { PdfGenerator } from '../../../application/ports/pdf-generator.port';

export class ExportWishlistPdfUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private listItemsUseCase: ListItemsPort,
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

    const { Items } = await this.listItemsUseCase.execute(listId, currentUserId);

    const ownerName = (wishlist.OwnerFirstName && wishlist.OwnerLastName)
      ? `${wishlist.OwnerFirstName} ${wishlist.OwnerLastName}`
      : (wishlist.OwnerFirstName || wishlist.OwnerUsername || 'Registry Owner');

    const ownerInfo = {
      name: ownerName,
      username: wishlist.OwnerUsername || 'user',
      avatarUrl: wishlist.OwnerAvatar || undefined,
    };

    return await this.pdfGenerator.generateWishlistPdf(
      wishlist,
      Items,
      themeColors,
      ownerInfo,
      currentUserId
    );
  }
}
