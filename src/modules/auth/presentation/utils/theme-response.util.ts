import { AppError } from '@/common/domain/errors/app-error';

export function createCachedCssResponse(content: string, request: Request): Response {
  const etag = `W/"${Bun.hash(content).toString(36)}"`;
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const isProd = process.env.NODE_ENV === 'production';
  return new Response(content, {
    headers: {
      'Content-Type': 'text/css',
      'Cache-Control': isProd ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
      ETag: etag,
    },
  });
}

export function createCachedFontResponse(bytes: Uint8Array, request: Request): Response {
  const etag = `W/"${Bun.hash(bytes).toString(36)}"`;
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const isProd = process.env.NODE_ENV === 'production';
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'font/woff2',
      'Cache-Control': isProd ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
      ETag: etag,
    },
  });
}

export function assertFontFilename(filename: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-\d+\.woff2$/.test(filename)) {
    throw new AppError('Invalid font filename.', 400, 'INVALID_FONT_FILENAME');
  }
}
