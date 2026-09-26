import type { IMAGE_DATA_URL_ALLOWED_TYPES } from '../constants/image-data-url.constant';

export type ImageDataUrlMime = (typeof IMAGE_DATA_URL_ALLOWED_TYPES)[number];
