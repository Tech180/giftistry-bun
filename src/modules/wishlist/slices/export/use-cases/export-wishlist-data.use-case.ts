import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { ListItemsPort } from '@/modules/item';
import type { UserRepository } from '@/modules/auth';
import { AppError } from '@/common/domain/errors/app-error';
import type { WishlistExportContext } from '../interfaces/wishlist-export-context.interface';
import type { WishlistExportResult } from '../interfaces/wishlist-export-result.interface';
import type { WishlistExportFormat } from '../types/wishlist-export-format.type';
import { buildWishlistCsvExport } from '../utils/build-wishlist-csv-export.util';
import { buildWishlistJsonExport } from '../utils/build-wishlist-json-export.util';
import { buildWishlistTxtExport } from '../utils/build-wishlist-txt-export.util';
import { buildWishlistXlsxExport } from '../utils/build-wishlist-xlsx-export.util';
import { getAudienceDisplayName } from '../utils/format-audience-for-export.util';
import { buildRelationNameById } from '../utils/format-relation-items-for-export.util';
import { getSortedItemsWithPriority } from '../utils/get-sorted-items-with-priority.util';
import { toRelationExportItems } from '../utils/to-relation-export-items.util';
import { toWishlistExportItems } from '../utils/to-wishlist-export-items.util';

export class ExportWishlistDataUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private listItemsUseCase: ListItemsPort,
    private userRepo: UserRepository
  ) {}

  async execute(
    listId: string,
    currentUserId: string,
    format: WishlistExportFormat
  ): Promise<WishlistExportResult> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const { Items } = await this.listItemsUseCase.execute(listId, currentUserId);
    const activeUser = await this.userRepo.findById(currentUserId);
    const exporterName = activeUser ? getAudienceDisplayName(activeUser) : undefined;
    const isOwner = currentUserId === wishlist.UserId;

    const exportContext: WishlistExportContext = {
      exporterName,
      isOwner,
      currentUserId,
    };

    const sorted = getSortedItemsWithPriority(toWishlistExportItems(Items));
    const includeSuggestionColumn = !isOwner;
    const relationItems = toRelationExportItems(sorted);
    const relationNameById = buildRelationNameById(relationItems);

    const builderParams = {
      wishlistTitle: wishlist.Title,
      items: sorted,
      exportContext,
      relationItems,
      relationNameById,
      includeSuggestionColumn,
    };

    switch (format) {
      case 'csv':
        return buildWishlistCsvExport(builderParams);
      case 'xlsx':
        return buildWishlistXlsxExport(builderParams);
      case 'txt':
        return buildWishlistTxtExport(builderParams);
      case 'json':
        return buildWishlistJsonExport(builderParams);
    }
  }
}
