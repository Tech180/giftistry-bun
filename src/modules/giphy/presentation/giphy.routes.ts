import { Elysia } from 'elysia';
import { authMiddleware } from '@/modules/auth';
import { GIPHY_SWAGGER_DETAIL } from './constants/swagger-detail.constant';
import type { GiphyRoutesDeps } from './interfaces/giphy-routes-deps.interface';
import { importGifBodySchema } from './schemas/import-gif-body.schema';
import { searchGifsQuerySchema } from './schemas/search-gifs-query.schema';

export const giphyRoutes = ({ useCases }: GiphyRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(authMiddleware)
    .get(
      '/gifs/status',
      async ({ getAuthUser }) => {
        const user = await getAuthUser();
        const status = useCases.getGiphyStatus.execute(user.userId);
        return { success: true, data: status };
      },
      {
        detail: {
          ...GIPHY_SWAGGER_DETAIL,
          summary: 'GIF search availability',
          description:
            'Returns whether a GIPHY API key is configured on this server (does not expose the key).',
        },
      }
    )
    .get(
      '/gifs/search',
      async ({ getAuthUser, query }) => {
        const user = await getAuthUser();
        const limit = query.limit !== undefined ? Number(query.limit) : undefined;
        const results = await useCases.searchGifs.execute(user.userId, query.q ?? '', limit);
        return { success: true, data: results };
      },
      {
        query: searchGifsQuerySchema,
        detail: {
          ...GIPHY_SWAGGER_DETAIL,
          summary: 'Search or list trending GIFs',
          description:
            'Proxies GIPHY search/trending for comment composers. Requires CanUseComments and a configured GiphyApiKey.',
        },
      }
    )
    .post(
      '/gifs/import',
      async ({
        getAuthUser,
        body: {
          Giftistry: {
            Gifs: { ImageUrl },
          },
        },
      }) => {
        const user = await getAuthUser();
        const result = await useCases.importGif.execute(user.userId, ImageUrl);
        return { success: true, data: result };
      },
      {
        body: importGifBodySchema,
        detail: {
          ...GIPHY_SWAGGER_DETAIL,
          summary: 'Import GIF from GIPHY CDN',
          description:
            'Downloads a GIPHY CDN image and returns a base64 data URL for comment attachment. Requires CanUseComments and CanUploadImages.',
        },
      }
    );
