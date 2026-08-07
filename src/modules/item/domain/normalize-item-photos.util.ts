import type { ItemPhoto } from '../item.entity';
import type { ItemPhotoWrite } from '../item-description.util';
import { AppError } from '@/common/middlewares/error.middleware';
import {
  assertImageDataUrl,
  ITEM_PHOTO_MAX_BYTES,
  ITEM_PHOTOS_MAX_COUNT,
} from '@/common/utils/image-data-url.util';

/**
 * Validate write payload photos and assign server-side Ids + SortOrder.
 * Returns null when `input` is undefined (caller should leave photos unchanged).
 */
export function normalizeItemPhotosWrite(
  input: ItemPhotoWrite[] | null | undefined
): ItemPhoto[] | null | undefined {
  if (input === undefined) return undefined;
  if (input === null || input.length === 0) return [];

  if (input.length > ITEM_PHOTOS_MAX_COUNT) {
    throw new AppError(
      `An item may have at most ${ITEM_PHOTOS_MAX_COUNT} photos.`,
      400,
      'BAD_REQUEST'
    );
  }

  return input.map((entry, index) => {
    const dataUrl = typeof entry?.DataUrl === 'string' ? entry.DataUrl : '';
    if (!dataUrl.trim()) {
      throw new AppError('Each photo requires a DataUrl.', 400, 'BAD_REQUEST');
    }
    assertImageDataUrl(dataUrl, { maxBytes: ITEM_PHOTO_MAX_BYTES });
    return {
      Id: crypto.randomUUID(),
      Url: dataUrl,
      SortOrder: index,
    };
  });
}
