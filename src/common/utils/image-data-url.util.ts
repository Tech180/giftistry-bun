import { AppError } from '@/common/domain/errors/app-error';
import {
  COMMENT_IMAGE_MAX_BYTES,
  IMAGE_DATA_URL_ALLOWED_TYPES,
} from './constants/image-data-url.constant';
import type { AssertImageDataUrlOptions } from './interfaces/assert-image-data-url-options.interface';

export function assertImageDataUrl(
  value: string,
  options: AssertImageDataUrlOptions = {}
): void {
  const maxBytes = options.maxBytes ?? COMMENT_IMAGE_MAX_BYTES;
  const allowedTypes = options.allowedTypes ?? IMAGE_DATA_URL_ALLOWED_TYPES;

  if (!value.startsWith('data:')) {
    throw new AppError('Invalid image format. Must be a base64 Data URL.', 400, 'BAD_REQUEST');
  }

  const matches = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const mimeType = matches?.[1]?.toLowerCase();
  const base64Data = matches?.[2];
  if (!mimeType || !base64Data) {
    throw new AppError('Invalid base64 Data URL encoding.', 400, 'BAD_REQUEST');
  }

  if (!allowedTypes.includes(mimeType)) {
    throw new AppError(
      `Invalid image format: ${mimeType}. Allowed formats: JPEG, PNG, GIF, WEBP.`,
      400,
      'BAD_REQUEST'
    );
  }

  const estimatedSize = base64Data.length * 0.75;
  if (estimatedSize > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new AppError(`Image size exceeds the ${mb}MB limit.`, 400, 'BAD_REQUEST');
  }
}
