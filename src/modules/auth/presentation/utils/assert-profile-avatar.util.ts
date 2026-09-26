import { AppError } from '@/common/domain/errors/app-error';
import { isAvatarColor } from '@/common/utils/avatar.util';

export function assertProfileAvatar(avatar: string | null | undefined): void {
  if (avatar === undefined || avatar === null) {
    return;
  }

  if (avatar.startsWith('data:')) {
    const matches = avatar.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!matches) {
      throw new AppError('Invalid image data URL format. Only base64 encoded images are allowed.', 400, 'BAD_REQUEST');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!mimeType || !base64Data || !allowedMimeTypes.includes(mimeType)) {
      throw new AppError('Invalid image type. Only PNG, JPG, and SVG are supported.', 400, 'BAD_REQUEST');
    }

    const sizeInBytes = Math.floor((base64Data.length * 3) / 4);
    const maxSize = 2 * 1024 * 1024;
    if (sizeInBytes > maxSize) {
      throw new AppError('Image size exceeds the 2MB limit.', 400, 'BAD_REQUEST');
    }
    return;
  }

  if (!isAvatarColor(avatar)) {
    throw new AppError('Invalid avatar format. Use an uploaded image or hsl color.', 400, 'BAD_REQUEST');
  }
}
