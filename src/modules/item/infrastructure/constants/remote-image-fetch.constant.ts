/** Timeout for remote product-image fetches. */
export const REMOTE_IMAGE_FETCH_TIMEOUT_MS = 10_000;

/** Magic-byte prefixes for sniffing image MIME types. */
export const IMAGE_MIME_BY_MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP checked in sniffMime
];
