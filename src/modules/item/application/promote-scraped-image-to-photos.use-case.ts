import type { ItemRepository } from '../domain/ports/item.repository';
import type { RemoteImageFetcher } from '../domain/ports/remote-image-fetcher.port';
import { normalizeItemPhotosWrite } from '../domain/normalize-item-photos.util';

/**
 * Seeds Item.Photos from a scraped remote image URL when the item has no photos yet.
 * Soft-fails on fetch/validation errors. Does not require CanUploadImages.
 */
export class PromoteScrapedImageToPhotosUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private remoteImageFetcher: RemoteImageFetcher
  ) {}

  async execute(itemId: string, imageUrl: string | null | undefined): Promise<boolean> {
    const url = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    if (!itemId || !url) return false;

    try {
      const item = await this.itemRepo.findById(itemId);
      if (!item) return false;
      if ((item.Photos?.length ?? 0) > 0) return false;

      const dataUrl = await this.remoteImageFetcher.fetchAsDataUrl(url);
      if (!dataUrl) return false;

      const photos = normalizeItemPhotosWrite([{ DataUrl: dataUrl }]);
      if (!photos || photos.length === 0) return false;

      await this.itemRepo.replacePhotos(itemId, photos);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[PromoteScrapedImage] failed itemId=${itemId} error=${message}`);
      return false;
    }
  }
}
