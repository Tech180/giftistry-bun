import type { Wishlist } from '../../domain/wishlist.entity';
import type { ThemeColors } from './theme-resolver.port';

export interface PdfGenerator {
  generateWishlistPdf(
    wishlist: Wishlist,
    items: any[],
    themeColors: ThemeColors,
    ownerInfo: { name: string; username: string; avatarUrl?: string }
  ): Promise<Uint8Array>;
}
