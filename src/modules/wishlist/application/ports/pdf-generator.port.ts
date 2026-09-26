import type { Wishlist } from '../../domain/interfaces/wishlist.interface';
import type { ThemeColors } from '../interfaces/theme-colors.interface';
import type { PdfOwnerInfo } from '../interfaces/pdf-owner-info.interface';

export interface PdfGenerator {
  generateWishlistPdf(
    wishlist: Wishlist,
    items: any[],
    themeColors: ThemeColors,
    ownerInfo: PdfOwnerInfo,
    viewerUserId?: string | null
  ): Promise<Uint8Array>;
}
