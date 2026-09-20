import { AppError } from '@/common/middlewares/error.middleware';

export const IMAGE_DATA_URL_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export type ImageDataUrlMime = (typeof IMAGE_DATA_URL_ALLOWED_TYPES)[number];

export const COMMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const ITEM_PHOTO_MAX_BYTES = 20 * 1024 * 1024;
export const ITEM_PHOTOS_MAX_COUNT = 10;

export interface AssertImageDataUrlOptions {
  maxBytes?: number;
  allowedTypes?: readonly string[];
}

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
