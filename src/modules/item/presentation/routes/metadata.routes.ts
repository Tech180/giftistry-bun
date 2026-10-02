import { Elysia } from 'elysia';
import { ITEM_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { ItemRoutesDeps } from '../interfaces/item-routes-deps.interface';
import { capturePageBodySchema } from '../schemas/capture-page-body.schema';
import { mapScrapeResultToApi } from '../utils/map-scrape-result-to-api.util';

export const metadataRoutes = ({ useCases, middleware }: ItemRoutesDeps) =>
  new Elysia()
    .use(middleware.auth)
    .post(
      '/items/metadata/capture-page',
      async ({
        getAuthUser,
        body: {
          Giftistry: {
            Items: { Url, Html, CapturedJson, ListId },
          },
        },
      }) => {
        const user = await getAuthUser();
        const result = await useCases.ingestCapturedPage.execute(
          Url,
          { html: Html, capturedJson: CapturedJson },
          user.userId,
          { listId: ListId }
        );
        return { success: true, data: mapScrapeResultToApi(result, Url) };
      },
      {
        detail: {
          ...ITEM_SWAGGER_DETAIL,
          summary: 'Ingest client-captured product page HTML',
          description:
            'Run extractor + AI populate on user-submitted HTML/JSON (no server fetch). Payload is untrusted; max ~2 MiB HTML.',
        },
        body: capturePageBodySchema,
      }
    );
