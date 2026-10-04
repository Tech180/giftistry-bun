import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { ListItemsPort } from '@/modules/item';
import type { UserRepository } from '@/modules/auth';
import { AppError } from '@/common/domain/errors/app-error';
import type { ThemeResolver } from '../../../application/ports/theme-resolver.port';
import type { PdfGenerator } from '../../../application/ports/pdf-generator.port';
import type { CheckListAccessUseCase } from '../../access/use-cases/check-list-access.use-case';
import { getAudienceDisplayName } from '../utils/format-audience-for-export.util';
import { buildRelationNameById } from '../utils/format-relation-items-for-export.util';
import { buildGiftistryExportItemFields } from '../utils/build-giftistry-export-item-fields.util';
import { toRelationExportItems } from '../utils/to-relation-export-items.util';
import { toWishlistExportItems } from '../utils/to-wishlist-export-items.util';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';

export class ExportWishlistPdfUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private listItemsUseCase: ListItemsPort,
    private userRepo: UserRepository,
    private themeResolver: ThemeResolver,
    private pdfGenerator: PdfGenerator,
    private checkListAccess: CheckListAccessUseCase
  ) {}

  async execute(listId: string, currentUserId: string): Promise<Uint8Array> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const access = await this.checkListAccess.execute(currentUserId, { listId });
    const user = await this.userRepo.findById(wishlist.UserId);
    const themeColors = await this.themeResolver.resolveThemeColors(user?.Theme || 'default');

    const { Items } = await this.listItemsUseCase.execute(listId, currentUserId);
    const activeUser = await this.userRepo.findById(currentUserId);
    const exportContext: WishlistExportContext = {
      exporterName: activeUser ? getAudienceDisplayName(activeUser) : undefined,
      isOwner: access.role === 'owner',
      currentUserId,
      listRole: access.role,
    };
    const exportItems = toWishlistExportItems(Items as unknown as Record<string, unknown>[]);
    const relationItems = toRelationExportItems(exportItems);
    const relationNameById = buildRelationNameById(relationItems);
    const fieldsById = new Map(
      exportItems.map((item) => [
        item.Id,
        buildGiftistryExportItemFields({
          item,
          relationItems,
          relationNameById,
          exportContext,
        }),
      ])
    );
    const pdfItems = Items.map((item) => {
      const fields = fieldsById.get(item.Id);
      return {
        ...item,
        IsFavorite: fields?.isFavorite ?? item.IsFavorite,
        ExportSuggestion: fields?.suggestion ?? '',
        ExportLinkedNames: fields?.linkedPeerNames ?? [],
        ExportRelatedNames: fields?.relatedPeerNames ?? [],
      };
    });

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
      pdfItems,
      themeColors,
      ownerInfo,
      currentUserId
    );
  }
}
